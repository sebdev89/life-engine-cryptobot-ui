import { describe, expect, it } from 'vitest';
import { ActionProposal, DeadLetter } from '../control-plane-api';
import { AnchorView } from '../receipts-api';
import { Stage } from '../live/live-model';
import { PROPOSALS_API_MAX, approvalLine, computeKpis, currentPhase, intentLine, latestRows, lettersOf, policyLine, usd } from './tower-model';

// Shapes of the demo stack after one Scenario A, one blocked retry inside the cooldown and one Scenario B
// (cryptobot-demo-main, 2026-09-30): three EXECUTED, one BLOCKED_BY_POLICY, one dead letter requeued.
function proposal(id: string, over: Partial<ActionProposal> = {}): ActionProposal {
  return {
    id,
    walletId: 'w1',
    walletAddress: 'G4bC…',
    cluster: 'devnet',
    status: 'EXECUTED',
    kind: 'REBALANCE',
    title: 'Rebalance: SOL → [79]',
    reasoningSummary: null,
    requestedBy: 'demo@cryptobot.local',
    intent: { targetWeights: { SOL: 79 }, counterAsset: 'USDC' },
    plan: {
      legs: [
        { action: 'SELL', symbol: 'SOL', mint: null, amount: 0.786362243, estimatedUsd: 94.08, weightPctBefore: 100, weightPctAfter: 79, counterAsset: 'USDC' },
      ],
      totalUsd: 448,
      weightsBefore: {},
      weightsAfter: {},
      turnoverUsd: 94.08,
      summary: '',
    },
    riskBefore: null,
    riskAfter: null,
    policy: null,
    simulation: null,
    transaction: null,
    approval: null,
    execution: null,
    runtimeRunId: null,
    expiresAt: null,
    createdAt: '2026-09-30T02:47:45.368058209Z',
    updatedAt: '2026-09-30T02:47:45.368058209Z',
    operationId: null,
    ...over,
  };
}

function executed(id: string, createdAt: string, confirmedAt: string, retries = 0): ActionProposal {
  return proposal(id, {
    createdAt,
    operationId: `op-${id}`,
    execution: {
      status: 'EXECUTED',
      signature: `sig-${id}`,
      explorerUrl: null,
      signerPublicKey: null,
      submittedAt: confirmedAt,
      confirmedAt,
      confirmationStatus: 'confirmed',
      error: null,
      retries,
    },
  });
}

function letter(id: string, proposalId: string, resolvedAt: string | null, outcome: DeadLetter['outcome'] = null): DeadLetter {
  return {
    id,
    source: 'RECONCILIATION',
    refId: proposalId,
    proposalId,
    ownerUserId: 'u',
    reason: 'No verdict after 3 reconciliation attempts',
    payload: {},
    createdAt: '2026-09-30T02:56:28Z',
    resolvedAt,
    resolvedBy: resolvedAt ? 'demo@cryptobot.local' : null,
    resolution: null,
    outcome,
  };
}

function anchor(root: string, status: AnchorView['anchor']['status'], receiptCount: number): AnchorView {
  return {
    anchor: { root, chain: 'solana-devnet', status, memo: '', receiptCount, tx: 'tx', slot: 1, attempts: 1, createdAt: '2026-09-30T02:56:31Z', finalizedAt: null },
    explorerUrl: null,
  };
}

const A1 = executed('a1', '2026-09-30T02:47:45.368Z', '2026-09-30T02:48:28.368Z'); // 43 s
const BLOCKED = proposal('blk', { status: 'BLOCKED_BY_POLICY', createdAt: '2026-09-30T02:48:44.365Z' });
const A2 = executed('a2', '2026-09-30T02:49:10.640Z', '2026-09-30T02:50:16.640Z'); // 66 s
const B1 = executed('b1', '2026-09-30T02:54:58.978188623Z', '2026-09-30T02:56:31.703986159Z', 1); // 92.726 s
const DEMO = [B1, A2, BLOCKED, A1];

describe('computeKpis', () => {
  it('counts the demo run exactly as the API returns it', () => {
    const k = computeKpis({
      proposals: DEMO,
      deadLetters: { deadLetters: [letter('dl1', 'b1', '2026-09-30T02:56:30Z', 'REQUEUED')], open: 0 },
      anchors: [anchor('r1', 'FINALIZED', 7), anchor('r0', 'FINALIZED', 5), anchor('r2', 'PENDING', 1)],
    });
    expect(k.window).toBe(4);
    expect(k.capped).toBe(false);
    expect(k.executions).toBe(3); // the blocked one never reached execute
    expect(k.finalized).toBe(3);
    expect(k.recovered).toBe(1);
    expect(k.dlqOpen).toBe(0);
    expect(k.dlqTotal).toBe(1);
    expect(k.retries).toBe(1);
    expect(k.retriedProposals).toBe(1);
    expect(k.proofs).toBe(2); // PENDING batch is not a proof yet
    expect(k.anchoredReceipts).toBe(12);
    expect(k.latencyN).toBe(3);
    expect(k.latencyMeanMs).toBe(Math.round((43000 + 66000 + 92726) / 3));
  });

  it('reports unknown, not zero, when a source is unreadable', () => {
    const k = computeKpis({ proposals: DEMO, deadLetters: null, anchors: null });
    expect(k.recovered).toBeNull();
    expect(k.dlqOpen).toBeNull();
    expect(k.dlqTotal).toBeNull();
    expect(k.proofs).toBeNull();
    expect(k.anchoredReceipts).toBeNull();
    expect(k.finalized).toBe(3);
  });

  it('an open dead letter is not a recovery until the proposal is EXECUTED', () => {
    const stuck = proposal('s1', { status: 'EXECUTING', operationId: 'op-s1' });
    const k = computeKpis({ proposals: [stuck], deadLetters: { deadLetters: [letter('dl2', 's1', null)], open: 1 }, anchors: [] });
    expect(k.recovered).toBe(0);
    expect(k.dlqOpen).toBe(1);
    expect(k.inFlight).toBe(1);
    expect(k.executions).toBe(1);
    expect(k.finalized).toBe(0);
  });

  it('is empty and honest with no proposals', () => {
    const k = computeKpis({ proposals: [], deadLetters: { deadLetters: [], open: 0 }, anchors: [] });
    expect(k.executions).toBe(0);
    expect(k.latencyMeanMs).toBeNull();
    expect(k.latencyN).toBe(0);
    expect(k.proofs).toBe(0);
  });

  it('flags the window when the API clamp may hide older proposals', () => {
    const many = Array.from({ length: PROPOSALS_API_MAX }, (_, i) => proposal(`p${i}`));
    expect(computeKpis({ proposals: many, deadLetters: null, anchors: null }).capped).toBe(true);
  });

  it('ignores latencies it cannot measure (no confirmedAt, clock skew)', () => {
    const noConfirm = proposal('x', { execution: { ...A1.execution!, confirmedAt: null }, operationId: 'op' });
    const skew = executed('y', '2026-09-30T03:00:00Z', '2026-09-30T02:59:59Z');
    const k = computeKpis({ proposals: [noConfirm, skew, A1], deadLetters: null, anchors: null });
    expect(k.latencyN).toBe(1);
    expect(k.latencyMeanMs).toBe(43000);
  });
});

function stage(id: Stage['id'], n: number, state: Stage['state']): Stage {
  return { id, n, label: id, state, durationMs: null, running: false, endedAt: null, evidence: null, steps: [], checks: [] };
}

describe('currentPhase', () => {
  const ids: Stage['id'][] = ['INTENT', 'POLICY', 'APPROVAL', 'SIGN', 'EXECUTE', 'FINALIZE', 'RECONCILE', 'PROVE'];
  const stages = (states: Stage['state'][]) => ids.map((id, i) => stage(id, i + 1, states[i] ?? 'pending'));

  it('is the active stage while running', () => {
    expect(currentPhase(stages(['done', 'done', 'active']))).toEqual({ id: 'APPROVAL', n: 3, state: 'active' });
  });
  it('is the failed or uncertain stage when stuck', () => {
    expect(currentPhase(stages(['done', 'done', 'done', 'done', 'uncertain']))?.id).toBe('EXECUTE');
    expect(currentPhase(stages(['done', 'failed', 'skipped']))).toEqual({ id: 'POLICY', n: 2, state: 'failed' });
  });
  it('is PROVE done when everything closed', () => {
    expect(currentPhase(stages(Array(8).fill('done')))).toEqual({ id: 'PROVE', n: 8, state: 'done' });
  });
  it('is the last closed stage when the rest is still pending', () => {
    expect(currentPhase(stages(['done', 'done', 'done', 'done', 'done', 'done', 'done', 'pending']))?.id).toBe('RECONCILE');
  });
  it('is null without stages', () => {
    expect(currentPhase([])).toBeNull();
  });
});

describe('row helpers', () => {
  it('intentLine reads the plan', () => {
    expect(intentLine(A1)).toBe('SELL 0.7864 SOL → USDC');
    expect(intentLine(proposal('t', { plan: { ...A1.plan, legs: [] } }))).toBe('Rebalance: SOL → [79]');
    const two = { ...A1.plan, legs: [A1.plan.legs[0], { ...A1.plan.legs[0], action: 'BUY' as const }] };
    expect(intentLine(proposal('t', { plan: two }))).toBe('SELL 0.7864 SOL → USDC (+1 leg)');
  });
  it('usd formats or dashes', () => {
    expect(usd(94.08)).toBe('$94.08');
    expect(usd(1234.5)).toBe('$1,234.50');
    expect(usd(null)).toBe('—');
  });
  it('policyLine prefers the graduated verdict', () => {
    expect(policyLine({ policy: null }).text).toBe('—');
    const base = { allowed: true, executable: true, violations: [], executionViolations: [], rulesApplied: [], evaluatedAt: '' };
    expect(policyLine({ policy: base })).toEqual({ text: 'ALLOW', ok: true });
    const verdict = {
      decision: 'DENY' as const,
      escalation: 'NONE' as const,
      tier: 'OVER_LIMIT' as const,
      failedPredicates: [],
      evaluatedPredicates: [],
      policyVersion: '',
      policyHash: '',
      inputHash: '',
    };
    expect(policyLine({ policy: { ...base, allowed: false, authorization: verdict } })).toEqual({ text: 'DENY · OVER LIMIT', ok: false });
  });
  it('approvalLine says the decision, or why nobody decided', () => {
    expect(approvalLine({ status: 'EXECUTED', approval: { decision: 'APPROVED', by: 'demo@cryptobot.local', at: '', note: null } })).toEqual({
      text: 'APPROVED',
      ok: true,
    });
    expect(approvalLine({ status: 'AWAITING_APPROVAL', approval: null }).text).toBe('awaiting human');
    expect(approvalLine({ status: 'BLOCKED_BY_POLICY', approval: null }).ok).toBe(false);
  });
  it('latestRows keeps executions newest first unless asked for all', () => {
    expect(latestRows(DEMO, 10).map((p) => p.id)).toEqual(['b1', 'a2', 'a1']);
    expect(latestRows(DEMO, 2).map((p) => p.id)).toEqual(['b1', 'a2']);
    expect(latestRows(DEMO, 10, true).map((p) => p.id)).toEqual(['b1', 'a2', 'blk', 'a1']);
  });
  it('lettersOf filters the loaded page', () => {
    expect(lettersOf([letter('d', 'b1', null), letter('e', 'a1', null)], 'b1').map((d) => d.id)).toEqual(['d']);
    expect(lettersOf(null, 'b1')).toEqual([]);
  });
});
