import { describe, expect, it } from 'vitest';
import { ActionProposal, AuditEvent, PolicyDecision } from '../control-plane-api';
import { IntelligenceReceipt } from '../receipts-api';
import {
  EV,
  NO_PROOF,
  ProofInput,
  STAGE_MAP,
  aggregateState,
  auditFacts,
  buildStages,
  buildTimeline,
  formatDuration,
  parseInstant,
  stepDurations,
  totalDuration,
  deadLetterKind,
  describeFailure,
  explorerTxUrlFor,
  isMainnetFailClosed,
  isTerminal,
  lastEvent,
  newOperationId,
  policyRows,
  predicateRows,
  proposalChanged,
} from './live-model';

// The audit sequences below are the ones recorded in the real devnet runs of 2026-09-20
// (Products/evidencia/cryptobot-e2e-devnet-20260920-{happy,chaos-rpc-down}.md).
const SIG1 = '4qeaKhgU4Yob4biUsRBW61wJ7ar2HKDkHD5vQUsMiPgzvukSKC8d8vPLkgH3hiWHLuvy7uAYcnPHDRsCo4s12sbV';
const SIG2 = '2mU1LTY3yn4jPa9hZXqK9dCff5qc8o2q5J8VV11aCRbCuVGpmVsogrVRyXoAQWUj37rMj2UzR6bf32JBcvTLag1m';
const H_R = 'sha256:1882cd0a2d23b799696de7cc13121af147dfe05f2d2bbfeeb6fe0108dcf3dff2';

function trail(types: (string | [string, Record<string, unknown>])[]): AuditEvent[] {
  return types.map((t, i) => {
    const [eventType, payload] = Array.isArray(t) ? t : [t, {}];
    return {
      id: `ev-${String(i).padStart(3, '0')}`,
      walletId: 'w',
      proposalId: 'p',
      eventType,
      actor: eventType.startsWith('EXECUTION') || eventType.startsWith('RECONCIL') ? 'cryptobot-service' : 'demo@cryptobot.local',
      payload,
      createdAt: `2026-09-20T17:27:${String(10 + i).padStart(2, '0')}Z`,
    };
  });
}

function proposal(over: Partial<ActionProposal> = {}): ActionProposal {
  return {
    id: '4c422b00-2fd3-422e-8319-08888986f11e',
    walletId: 'f0c07b9c-d1fb-4f9c-b68a-96b5c8db02d0',
    walletAddress: 'G4bCRqj3yjQZyMrjxETKvrEhXeYhNzsGY97kipXr4exS',
    cluster: 'devnet',
    status: 'PROPOSED',
    kind: 'REBALANCE',
    title: 'SOL 100% → 60%',
    reasoningSummary: null,
    requestedBy: 'demo@cryptobot.local',
    intent: { targetWeights: { SOL: 60 }, counterAsset: 'USDC' },
    plan: {
      legs: [],
      totalUsd: 109.6,
      weightsBefore: { SOL: 100 },
      weightsAfter: { SOL: 60 },
      turnoverUsd: 43.84,
      summary: 'SELL 0.3999 SOL (≈$43.84) → SOL 100.0% → 60.0%',
    },
    riskBefore: null,
    riskAfter: null,
    policy: null,
    simulation: { economic: null, onchain: { ok: true, error: null, unitsConsumed: 150, logs: [], cluster: 'devnet' } },
    transaction: null,
    approval: null,
    execution: null,
    runtimeRunId: null,
    expiresAt: null,
    createdAt: '2026-09-20T17:27:10Z',
    updatedAt: '2026-09-20T17:27:10Z',
    operationId: null,
    ...over,
  };
}

const HAPPY = trail([
  EV.CREATED,
  EV.SIMULATED,
  [EV.POLICY, { decision: 'ALLOW', tier: 'AUTONOMOUS', policyHash: H_R }],
  EV.AWAITING,
  [EV.APPROVED, { executableAt: '2026-09-20T17:27:29.158597140Z' }],
  [EV.STARTED, { operationId: 'ef13435b-aa4c-4f02-bd13-c2d2886eb3bb' }],
  [
    EV.VALIDATED,
    {
      validator: 'DQ1R2tc155RkF9eqDpija1Z6b5kGeGFMpLLRJkhWN2xp',
      decision: 'ALLOW',
      verdictHash: 'sha256:fa9004f84daf8268d2fae4eb5903967a335b054d1ce58d4ea6737caae68ddf44',
    },
  ],
  [EV.SIGNED, { signature: SIG1 }],
  [EV.SUBMITTED, { signature: SIG1 }],
  [EV.EXECUTED, { signature: SIG1, confirmation: 'confirmed' }],
]);

const states = (steps: ReturnType<typeof buildTimeline>) => Object.fromEntries(steps.map((s) => [s.id, s.state]));

describe('buildTimeline — happy path (evidence 20260920-142703)', () => {
  it('closes every step up to EXECUTED and leaves reconciliation as "not needed"', () => {
    const steps = buildTimeline(proposal({ status: 'EXECUTED', operationId: 'ef13435b-aa4c-4f02-bd13-c2d2886eb3bb' }), HAPPY, [
      'STRATEGY',
      'RISK_DECISION',
      'SIMULATION',
      'EXECUTION',
    ]);
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(states(steps)).toEqual({
      intent: 'done',
      simulation: 'done',
      policy: 'done',
      approval: 'done',
      timelock: 'done',
      preconditions: 'done',
      validator: 'done',
      signer: 'done',
      submit: 'done',
      confirm: 'done',
      reconcile: 'skipped',
      receipt: 'done',
    });
    const by = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(by['policy'].note).toBe('ALLOW · tier AUTONOMOUS · H_R sha256:1882cd…dff2');
    expect(by['validator'].note).toContain('ALLOW');
    expect(by['validator'].note).toContain('verdict sha256:fa9004…df44');
    expect(by['signer'].note).toBe(`signature ${SIG1.slice(0, 8)}…${SIG1.slice(-6)} · persisted before broadcast`);
    expect(by['confirm'].note).toBe('EXECUTED · confirmed');
    expect(by['timelock'].note).toBe('executable at 2026-09-20 17:27:29 UTC');
    expect(by['preconditions'].note).toBe('operationId ef13435b-aa4c-4f02-bd13-c2d2886eb3bb');
    expect(by['reconcile'].note).toBe('not needed: closed by confirmation');
    expect(by['receipt'].state).toBe('done');
  });

  it('the receipt step stays active until the EXECUTION receipt exists', () => {
    const steps = buildTimeline(proposal({ status: 'EXECUTED' }), HAPPY, ['STRATEGY']);
    expect(states(steps)['receipt']).toBe('active');
  });

  it('marks the next thing the service will do as active while in flight', () => {
    const awaiting = buildTimeline(proposal({ status: 'AWAITING_APPROVAL' }), HAPPY.slice(0, 4));
    expect(states(awaiting)).toMatchObject({ policy: 'done', approval: 'active', timelock: 'pending', preconditions: 'pending', validator: 'pending' });

    const approved = buildTimeline(proposal({ status: 'APPROVED' }), HAPPY.slice(0, 5));
    expect(states(approved)).toMatchObject({ approval: 'done', timelock: 'active', preconditions: 'pending' });

    const signed = buildTimeline(proposal({ status: 'EXECUTING' }), HAPPY.slice(0, 8));
    expect(states(signed)).toMatchObject({ validator: 'done', signer: 'done', submit: 'active', confirm: 'pending', reconcile: 'active' });

    const submitted = buildTimeline(proposal({ status: 'SUBMITTED' }), HAPPY.slice(0, 9));
    expect(states(submitted)).toMatchObject({ submit: 'done', confirm: 'active', reconcile: 'active' });
  });

  it('returns nothing without a proposal', () => {
    expect(buildTimeline(null, HAPPY)).toEqual([]);
  });
});

describe('buildTimeline — chaos rpc-down (evidence 20260920-142752)', () => {
  const uncertain = trail([
    EV.CREATED,
    EV.SIMULATED,
    [EV.POLICY, { decision: 'ALLOW', tier: 'AUTONOMOUS', policyHash: H_R }],
    EV.AWAITING,
    [EV.APPROVED, { executableAt: '2026-09-20T17:28:05Z' }],
    [EV.STARTED, { operationId: '9b02af63-d4d2-49bd-b4dc-47ebaa150ac0' }],
    [EV.VALIDATED, { validator: 'DQ1R', decision: 'ALLOW' }],
    [EV.SIGNED, { signature: SIG1 }],
    [EV.BROADCAST_UNCERTAIN, { signature: SIG1, error: 'sendTransaction: Solana RPC call failed (chaos rpc-down): chaos: rpc down' }],
  ]);

  it('shows the broadcast as uncertain (the service said it does not know) and reconciliation as active', () => {
    const steps = buildTimeline(proposal({ status: 'EXECUTING' }), uncertain);
    expect(states(steps)).toMatchObject({ signer: 'done', submit: 'uncertain', confirm: 'active', reconcile: 'active' });
    const submit = steps.find((s) => s.id === 'submit')!;
    expect(submit.note).toContain('broadcast uncertain');
    expect(submit.note).toContain('chaos rpc-down');
  });

  it('shows the dead letter as uncertain until a human requeues it', () => {
    const dlq = [
      ...uncertain,
      ...trail([[EV.AMBIGUOUS, { reason: 'No verdict after 3 reconciliation attempts' }]]).map((e, i) => ({
        ...e,
        id: `dlq-${i}`,
        createdAt: `2026-09-20T17:29:0${i}Z`,
      })),
    ];
    const steps = buildTimeline(proposal({ status: 'EXECUTING' }), dlq);
    expect(states(steps)['reconcile']).toBe('uncertain');
    expect(steps.find((s) => s.id === 'reconcile')!.note).toBe('RECONCILIATION_AMBIGUOUS → dead letter (No verdict after 3 reconciliation attempts)');
  });

  it('after requeue + idempotent retry the trail ends EXECUTED with the second signature, and the retry is visible', () => {
    const full = [
      ...uncertain,
      ...trail([
        [EV.AMBIGUOUS, { reason: 'No verdict after 3 reconciliation attempts' }],
        [EV.DLQ_REQUEUED, { deadLetterId: '3a88532c', outcome: 'REQUEUED' }],
        [EV.RETRIED, { operationId: '9b02af63-d4d2-49bd-b4dc-47ebaa150ac0', retry: 1, previousSignature: SIG1, signature: SIG2 }],
        [EV.VALIDATED, { validator: 'DQ1R', decision: 'ALLOW' }],
        [EV.SIGNED, { signature: SIG2 }],
        [EV.SUBMITTED, { signature: SIG2 }],
        [EV.EXECUTED, { signature: SIG2, confirmation: 'confirmed' }],
      ]).map((e, i) => ({ ...e, id: `r-${i}`, createdAt: `2026-09-20T17:30:${String(10 + i).padStart(2, '0')}Z` })),
    ];
    const steps = buildTimeline(proposal({ status: 'EXECUTED', operationId: '9b02af63-d4d2-49bd-b4dc-47ebaa150ac0' }), full, ['EXECUTION']);
    expect(states(steps)).toMatchObject({ submit: 'done', confirm: 'done', reconcile: 'done', receipt: 'done' });
    const by = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(by['preconditions'].note).toBe('operationId 9b02af63-d4d2-49bd-b4dc-47ebaa150ac0 · retry #1');
    expect(by['submit'].note).toBe(`SUBMITTED · ${SIG2.slice(0, 8)}…${SIG2.slice(-6)}`);
    expect(by['reconcile'].note).toBe(`retried idempotently · same operationId · new signature ${SIG2.slice(0, 8)}…${SIG2.slice(-6)}`);
  });

  it('a broadcast-uncertain row the reconciler found confirmed reads as done (no retry)', () => {
    const reconciled = [
      ...uncertain,
      ...trail([
        [EV.RECONCILED, { from: 'EXECUTING', to: 'EXECUTED', signature: SIG1, confirmation: 'finalized' }],
        [EV.EXECUTED, { signature: SIG1, confirmation: 'finalized' }],
      ]).map((e, i) => ({ ...e, id: `rc-${i}`, createdAt: `2026-09-20T17:31:0${i}Z` })),
    ];
    const steps = buildTimeline(proposal({ status: 'EXECUTED' }), reconciled);
    expect(states(steps)).toMatchObject({ submit: 'done', confirm: 'done', reconcile: 'done' });
    expect(steps.find((s) => s.id === 'reconcile')!.note).toBe('RECONCILED EXECUTING → EXECUTED');
  });
});

describe('buildTimeline — the control plane says no', () => {
  it('BLOCKED_BY_POLICY fails at the policy step and skips everything after it', () => {
    const blocked = trail([EV.CREATED, EV.SIMULATED, [EV.POLICY, { decision: 'DENY', tier: 'OVER_LIMIT', policyHash: H_R }], EV.BLOCKED]);
    const steps = buildTimeline(proposal({ status: 'BLOCKED_BY_POLICY' }), blocked);
    expect(states(steps)).toEqual({
      intent: 'done',
      simulation: 'done',
      policy: 'failed',
      approval: 'skipped',
      timelock: 'skipped',
      preconditions: 'skipped',
      validator: 'skipped',
      signer: 'skipped',
      submit: 'skipped',
      confirm: 'skipped',
      reconcile: 'skipped',
      receipt: 'skipped',
    });
    expect(steps.find((s) => s.id === 'policy')!.note).toBe('BLOCKED_BY_POLICY · DENY · tier OVER_LIMIT · H_R sha256:1882cd…dff2');
  });

  it('REJECTED by the human fails the approval step', () => {
    const rejected = trail([EV.CREATED, EV.SIMULATED, EV.POLICY, EV.AWAITING, EV.REJECTED]);
    const steps = buildTimeline(proposal({ status: 'REJECTED' }), rejected);
    expect(states(steps)).toMatchObject({ policy: 'done', approval: 'failed', timelock: 'skipped', preconditions: 'skipped' });
    expect(steps.find((s) => s.id === 'approval')!.note).toBe('REJECTED by demo@cryptobot.local');
  });

  it('CANCELLED inside the timelock fails the timelock step', () => {
    const cancelled = trail([EV.CREATED, EV.SIMULATED, EV.POLICY, EV.AWAITING, [EV.APPROVED, { executableAt: '2026-09-20T18:00:00Z' }], EV.CANCELLED]);
    const steps = buildTimeline(proposal({ status: 'REJECTED' }), cancelled);
    expect(states(steps)).toMatchObject({ approval: 'done', timelock: 'failed', preconditions: 'skipped' });
    expect(steps.find((s) => s.id === 'timelock')!.note).toBe('CANCELLED by demo@cryptobot.local');
  });

  it('a validator refusal fails at the validator step and signs nothing', () => {
    const refused = trail([
      EV.CREATED,
      EV.SIMULATED,
      EV.POLICY,
      EV.AWAITING,
      EV.APPROVED,
      EV.STARTED,
      [EV.EXECUTION_FAILED, { stage: 'VALIDATE', error: 'validator refused: verdict hash mismatch' }],
    ]);
    const steps = buildTimeline(proposal({ status: 'FAILED' }), refused);
    expect(states(steps)).toMatchObject({ preconditions: 'done', validator: 'failed', signer: 'skipped', submit: 'skipped' });
    expect(steps.find((s) => s.id === 'validator')!.note).toBe('validator refused: verdict hash mismatch');
  });

  it('an on-chain failure fails the confirmation step', () => {
    const onchain = [
      ...HAPPY.slice(0, 9),
      ...trail([[EV.EXECUTION_FAILED, { signature: SIG1, error: 'InstructionError', stage: 'onchain' }]]).map((e) => ({
        ...e,
        id: 'f',
        createdAt: '2026-09-20T17:40:00Z',
      })),
    ];
    const steps = buildTimeline(proposal({ status: 'FAILED' }), onchain);
    expect(states(steps)).toMatchObject({ submit: 'done', confirm: 'failed' });
  });
});

describe('policy helpers', () => {
  const mainnet: PolicyDecision = {
    allowed: true,
    executable: false,
    violations: [],
    executionViolations: [
      { rule: 'EXECUTION_CLUSTER', message: 'Execution is only allowed on devnet; this wallet is on mainnet-beta' },
      { rule: 'ONCHAIN_SIMULATION_PASSED', message: 'On-chain simulation did not pass: "InvalidAccountForFee"' },
      { rule: 'SIGNER_CONTROLS_WALLET', message: 'The signer does not control this wallet (read-only wallet): paper trade only' },
    ],
    rulesApplied: ['KILL_SWITCH', 'ASSET_ALLOWLIST', 'MAX_TRADE_USD', 'EXECUTION_CLUSTER', 'ONCHAIN_SIMULATION_PASSED', 'SIGNER_CONTROLS_WALLET'],
    evaluatedAt: '2026-09-20T17:27:00Z',
    authorization: {
      decision: 'ALLOW',
      escalation: 'NONE',
      tier: 'AUTONOMOUS',
      failedPredicates: [],
      evaluatedPredicates: ['ASSET_ALLOWED', 'TRADE_VALUE_WITHIN_LIMIT', 'ASSET_CONCENTRATION'],
      policyVersion: 'cryptobot-policy-v1',
      policyHash: H_R,
      inputHash: 'sha256:' + 'a'.repeat(64),
    },
  };

  it('policyRows: one row per applied rule, execution violations as not-executable, blocked ones as blocked', () => {
    const rows = policyRows(mainnet);
    expect(rows.map((r) => `${r.rule}:${r.state}`)).toEqual([
      'KILL_SWITCH:pass',
      'ASSET_ALLOWLIST:pass',
      'MAX_TRADE_USD:pass',
      'EXECUTION_CLUSTER:not-executable',
      'ONCHAIN_SIMULATION_PASSED:not-executable',
      'SIGNER_CONTROLS_WALLET:not-executable',
    ]);
    expect(rows[3].message).toContain('mainnet-beta');
    const blocked = policyRows({ ...mainnet, allowed: false, violations: [{ rule: 'MAX_TRADE_USD', message: 'too big' }] });
    expect(blocked.find((r) => r.rule === 'MAX_TRADE_USD')).toEqual({ rule: 'MAX_TRADE_USD', state: 'blocked', message: 'too big' });
    // a violated rule the engine did not list as applied still shows up
    const extra = policyRows({ ...mainnet, rulesApplied: [], violations: [{ rule: 'COOLDOWN', message: 'wait' }] });
    expect(extra.map((r) => r.rule)).toContain('COOLDOWN');
    expect(policyRows(null)).toEqual([]);
  });

  it('predicateRows: evaluated predicates with the failed ones flagged', () => {
    expect(predicateRows(mainnet).map((r) => r.failed)).toEqual([false, false, false]);
    const denied = predicateRows({ ...mainnet, authorization: { ...mainnet.authorization!, failedPredicates: ['ASSET_CONCENTRATION'] } });
    expect(denied.find((r) => r.predicate === 'ASSET_CONCENTRATION')!.failed).toBe(true);
    expect(predicateRows({ ...mainnet, authorization: null })).toEqual([]);
  });

  it('isMainnetFailClosed: a mainnet wallet or an EXECUTION_CLUSTER violation', () => {
    expect(isMainnetFailClosed({ cluster: 'mainnet-beta', policy: null })).toBe(true);
    expect(isMainnetFailClosed({ cluster: 'devnet', policy: mainnet })).toBe(true);
    expect(isMainnetFailClosed({ cluster: 'devnet', policy: { ...mainnet, executionViolations: [] } })).toBe(false);
    expect(isMainnetFailClosed(null)).toBe(false);
  });
});

describe('explorerTxUrlFor', () => {
  it('prefers the URL the service stored, else devnet gets ?cluster=devnet and mainnet nothing', () => {
    expect(explorerTxUrlFor('devnet', SIG1, 'https://stored/x')).toBe('https://stored/x');
    expect(explorerTxUrlFor('devnet', SIG1)).toBe(`https://explorer.solana.com/tx/${SIG1}?cluster=devnet`);
    expect(explorerTxUrlFor('mainnet-beta', SIG1)).toBe(`https://explorer.solana.com/tx/${SIG1}`);
    expect(explorerTxUrlFor('devnet', null)).toBeNull();
  });
});

describe('describeFailure', () => {
  it('flattens what throwHttp attached and flags a 409', () => {
    const conflict = Object.assign(new Error('[CONFLICT] Policy marked this proposal as not executable'), {
      apiError: { status: 409, code: 'CONFLICT', message: 'Policy marked this proposal as not executable' },
    });
    expect(describeFailure(conflict)).toEqual({ status: 409, code: 'CONFLICT', message: 'Policy marked this proposal as not executable', conflict: true });
    const mainnet = Object.assign(new Error('x'), { apiError: { status: 409, code: 'MAINNET_DISABLED', message: 'mainnet is disabled' } });
    expect(describeFailure(mainnet).code).toBe('MAINNET_DISABLED');
    expect(describeFailure(new Error('network down'))).toEqual({ status: null, code: null, message: 'network down', conflict: false });
    expect(describeFailure('boom').message).toBe('boom');
  });
});

describe('small helpers', () => {
  it('lastEvent returns the most recent of a type (a retry repeats SIGNED)', () => {
    const twice = trail([[EV.SIGNED, { signature: SIG1 }], EV.STARTED, [EV.SIGNED, { signature: SIG2 }]]);
    expect(lastEvent(twice, EV.SIGNED)!.payload['signature']).toBe(SIG2);
    expect(lastEvent(twice, EV.EXECUTED)).toBeNull();
  });

  it('isTerminal / proposalChanged', () => {
    expect(isTerminal('EXECUTED')).toBe(true);
    expect(isTerminal('SUBMITTED')).toBe(false);
    const p = proposal({ status: 'APPROVED', updatedAt: 't1' });
    expect(proposalChanged(null, p)).toBe(true);
    expect(proposalChanged(p, { ...p })).toBe(false);
    expect(proposalChanged(p, { ...p, updatedAt: 't2' })).toBe(true);
    expect(proposalChanged(p, { ...p, status: 'EXECUTING' })).toBe(true);
  });

  it('deadLetterKind: payload.kind for reconciliation letters, the source otherwise', () => {
    expect(deadLetterKind({ source: 'RECONCILIATION', payload: { kind: 'ambiguous' } })).toBe('ambiguous');
    expect(deadLetterKind({ source: 'OUTBOX', payload: {} })).toBe('outbox');
  });

  it('auditFacts: the keys worth a line, signatures shortened, nothing invented', () => {
    expect(auditFacts({ payload: { decision: 'ALLOW', tier: 'AUTONOMOUS', signature: SIG1, ignored: 'x' } })).toBe(
      `decision=ALLOW · tier=AUTONOMOUS · signature=${SIG1.slice(0, 8)}…${SIG1.slice(-6)}`,
    );
    expect(auditFacts({ payload: {} })).toBe('');
    expect(auditFacts({ payload: { failedPredicates: ['A', 'B'], error: null } })).toBe('');
  });

  it('newOperationId is a v4 UUID and unique per call', () => {
    const a = newOperationId();
    const b = newOperationId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});

// ---- The 12 steps as the 8 stages of the product -------------------------------------

const ROOT = 'sha256:' + '9f'.repeat(32);
const ANCHOR_TX = '2vXa9mMemoAnchorTx8Qw1zPp3kLr6YtUe5sDfGhJkL9nBvCxZa1s2d3f4g5h6j7k8m9n1p2q3r4s5t6u7v8w9';

function execReceipt(anchored: boolean): IntelligenceReceipt {
  return {
    receiptHash: 'sha256:' + 'd3'.repeat(32),
    body: {
      kind: 'EXECUTION',
      agentId: 'cryptobot.execution',
      reproducibility: 'L1_REPRODUCIBLE',
      parents: [],
      model: null,
      engine: null,
      runtime: null,
      output: { hash: 'sha256:' + 'ee'.repeat(32), schema: null },
      completedAt: '2026-09-20T17:27:25Z',
    },
    signature: { alg: 'ed25519', keyId: 'k' },
    anchor: anchored ? { chain: 'solana-devnet', tx: ANCHOR_TX, slot: 412998877, root: ROOT, proof: ['L:' + ROOT, 'R:' + ROOT] } : null,
    createdAt: '2026-09-20T17:27:25Z',
  };
}

function proofOf(over: Partial<ProofInput> & { status?: 'PENDING' | 'SUBMITTED' | 'FINALIZED' | 'FAILED' } = {}): ProofInput {
  const status = over.status ?? 'FINALIZED';
  return {
    receipt: execReceipt(status === 'FINALIZED'),
    batch: {
      root: ROOT,
      chain: 'solana-devnet',
      status,
      memo: 'm',
      receiptCount: 3,
      tx: status === 'PENDING' ? null : ANCHOR_TX,
      slot: status === 'FINALIZED' ? 412998877 : null,
      attempts: 1,
      createdAt: '2026-09-20T17:27:30Z',
      finalizedAt: status === 'FINALIZED' ? '2026-09-20T17:27:40Z' : null,
    },
    batchExplorerUrl: `https://explorer.solana.com/tx/${ANCHOR_TX}?cluster=devnet`,
    proof: ['L:' + ROOT, 'R:' + ROOT],
    inclusion: true,
    ...over,
  };
}

const EXECUTED = () =>
  proposal({
    status: 'EXECUTED',
    operationId: 'ef13435b-aa4c-4f02-bd13-c2d2886eb3bb',
    execution: { status: 'EXECUTED', signature: SIG1 } as ActionProposal['execution'],
  });

const stageStates = (stages: ReturnType<typeof buildStages>) => Object.fromEntries(stages.map((s) => [s.id, s.state]));
const stageDur = (stages: ReturnType<typeof buildStages>) => Object.fromEntries(stages.map((s) => [s.id, s.durationMs]));

describe('buildStages — 12 steps → INTENT · POLICY · APPROVAL · SIGN · EXECUTE · FINALIZE · RECONCILE · PROVE', () => {
  it('maps each of the 12 steps to exactly one stage', () => {
    expect(STAGE_MAP.map((s) => s.id)).toEqual(['INTENT', 'POLICY', 'APPROVAL', 'SIGN', 'EXECUTE', 'FINALIZE', 'RECONCILE', 'PROVE']);
    const ids = buildTimeline(EXECUTED(), HAPPY, ['EXECUTION']).map((s) => s.id);
    // Same 12, each once (preconditions reads under POLICY, so the order is the product's, not the 12-step one).
    expect([...STAGE_MAP.flatMap((s) => s.steps)].sort()).toEqual([...ids].sort());
    const stages = buildStages(EXECUTED(), buildTimeline(EXECUTED(), HAPPY, ['EXECUTION']), proofOf());
    expect(stages.flatMap((s) => s.steps.map((x) => x.id)).sort()).toEqual([...ids].sort());
    expect(stages.find((s) => s.id === 'POLICY')!.steps.map((x) => x.id)).toEqual(['simulation', 'policy', 'preconditions']);
    expect(stages.find((s) => s.id === 'PROVE')!.checks.map((x) => x.id)).toEqual(['anchor', 'inclusion']);
  });

  it('an EXECUTED proposal with a valid inclusion proof: 7 stages done, reconciliation not needed, durations add up', () => {
    const steps = buildTimeline(EXECUTED(), HAPPY, ['EXECUTION']);
    const stages = buildStages(EXECUTED(), steps, proofOf());
    expect(stageStates(stages)).toEqual({
      INTENT: 'done',
      POLICY: 'done',
      APPROVAL: 'done',
      SIGN: 'done',
      EXECUTE: 'done',
      FINALIZE: 'done',
      RECONCILE: 'skipped',
      PROVE: 'done',
    });
    // HAPPY events are 1 s apart (17:27:10 → :19); the timelock closes at EXECUTION_STARTED (:15),
    // the receipt is written at :25 and the anchor batch finalizes at :40.
    expect(stageDur(stages)).toEqual({
      INTENT: null,
      POLICY: 2000,
      APPROVAL: 3000,
      SIGN: 2000,
      EXECUTE: 1000,
      FINALIZE: 1000,
      RECONCILE: null,
      PROVE: 21000,
    });
    expect(totalDuration(stages)).toBe(30000); // 17:27:10 → 17:27:40, first event to the anchor
    expect(stages.some((s) => s.running)).toBe(false);
  });

  it('gives each stage one line of evidence, with the explorer link where there is a transaction', () => {
    const stages = buildStages(EXECUTED(), buildTimeline(EXECUTED(), HAPPY, ['EXECUTION']), proofOf());
    const ev = Object.fromEntries(stages.map((s) => [s.id, s.evidence]));
    const explorer = `https://explorer.solana.com/tx/${SIG1}?cluster=devnet`;
    expect(ev['INTENT']!.text).toContain('SELL 0.3999 SOL');
    expect(ev['POLICY']!.text).toBe('ALLOW · tier AUTONOMOUS · H_R sha256:1882cd…dff2');
    expect(ev['SIGN']).toEqual({ text: `signature ${SIG1.slice(0, 8)}…${SIG1.slice(-6)}`, href: explorer });
    expect(ev['EXECUTE']!.href).toBe(explorer);
    expect(ev['FINALIZE']!.text).toBe('EXECUTED · confirmed');
    expect(ev['RECONCILE']!.text).toBe('not needed: closed by confirmation');
    expect(ev['PROVE']).toEqual({ text: 'inclusion proof valid · root sha256:9f9f9f…9f9f', href: `https://explorer.solana.com/tx/${ANCHOR_TX}?cluster=devnet` });
  });

  it('PROVE follows the receipt, the batch and the proof check', () => {
    const steps = buildTimeline(EXECUTED(), HAPPY, ['EXECUTION']);
    const prove = (p: ProofInput) => buildStages(EXECUTED(), steps, p).find((s) => s.id === 'PROVE')!;

    const noReceipt = buildStages(EXECUTED(), buildTimeline(EXECUTED(), HAPPY, []), NO_PROOF).find((s) => s.id === 'PROVE')!;
    expect(noReceipt.state).toBe('active');
    expect(noReceipt.checks.map((c) => c.state)).toEqual(['pending', 'pending']);

    const submitted = prove(proofOf({ status: 'SUBMITTED', inclusion: null }));
    expect(submitted.state).toBe('active');
    expect(submitted.checks[0].note).toBe('batch SUBMITTED · waiting for finality');

    const unchecked = prove(proofOf({ inclusion: null }));
    expect(unchecked.state).toBe('active');
    expect(unchecked.checks[1].note).toContain('not checked here');

    const broken = prove(proofOf({ inclusion: false }));
    expect(broken.state).toBe('failed');
    expect(broken.evidence!.text).toBe('proof does NOT fold to the anchored root');

    expect(prove(proofOf({ status: 'FAILED', inclusion: null })).state).toBe('failed');
  });

  it('an active stage is running: its duration grows with `now`', () => {
    const awaiting = proposal({ status: 'AWAITING_APPROVAL' });
    const steps = buildTimeline(awaiting, HAPPY.slice(0, 4));
    const now = parseInstant('2026-09-20T17:27:42Z')!;
    const stages = buildStages(awaiting, steps, NO_PROOF, [], now);
    expect(stageStates(stages)).toMatchObject({ INTENT: 'done', POLICY: 'done', APPROVAL: 'active', SIGN: 'pending', PROVE: 'pending' });
    expect(stages.filter((s) => s.running).map((s) => s.id)).toEqual(['APPROVAL']); // one clock at a time
    const approval = stages.find((s) => s.id === 'APPROVAL')!;
    expect(approval.running).toBe(true);
    expect(approval.durationMs).toBe(30000); // last event 17:27:12 (policy) → now
    expect(buildStages(awaiting, steps, NO_PROOF, [], null).find((s) => s.id === 'APPROVAL')!.durationMs).toBeNull();
  });

  it('BLOCKED_BY_POLICY fails POLICY and skips every stage after it', () => {
    const blocked = trail([EV.CREATED, EV.SIMULATED, [EV.POLICY, { decision: 'DENY', tier: 'OVER_LIMIT', policyHash: H_R }], EV.BLOCKED]);
    const p = proposal({ status: 'BLOCKED_BY_POLICY' });
    const stages = buildStages(p, buildTimeline(p, blocked));
    expect(stageStates(stages)).toEqual({
      INTENT: 'done',
      POLICY: 'failed',
      APPROVAL: 'skipped',
      SIGN: 'skipped',
      EXECUTE: 'skipped',
      FINALIZE: 'skipped',
      RECONCILE: 'skipped',
      PROVE: 'skipped',
    });
    expect(stages[1].evidence!.text).toContain('BLOCKED_BY_POLICY');
  });

  it('chaos rpc-down: EXECUTE uncertain, then RECONCILE uncertain with the dead letter id', () => {
    const t = trail([
      EV.CREATED,
      EV.SIMULATED,
      EV.POLICY,
      EV.AWAITING,
      EV.APPROVED,
      EV.STARTED,
      EV.VALIDATED,
      [EV.SIGNED, { signature: SIG1 }],
      [EV.BROADCAST_UNCERTAIN, { error: 'chaos: rpc down' }],
      [EV.AMBIGUOUS, { reason: 'No verdict after 3 reconciliation attempts' }],
    ]);
    const p = proposal({ status: 'EXECUTING' });
    const stages = buildStages(p, buildTimeline(p, t), NO_PROOF, [{ id: '3a88532c-70e1-40d0-8b84-205162ad23fb', resolvedAt: null }]);
    expect(stageStates(stages)).toMatchObject({ SIGN: 'done', EXECUTE: 'uncertain', FINALIZE: 'active', RECONCILE: 'uncertain', PROVE: 'pending' });
    expect(stages.find((s) => s.id === 'EXECUTE')!.evidence!.text).toContain('broadcast uncertain');
    expect(stages.find((s) => s.id === 'RECONCILE')!.evidence!.text).toMatch(/^dead letter 3a88532c open · RECONCILIATION_AMBIGUOUS/);
  });

  it('returns nothing without steps', () => {
    expect(buildStages(null, [])).toEqual([]);
  });
});

describe('stage helpers', () => {
  it('aggregateState: failed > uncertain > active > done; skipped and later pending checks do not hold done back', () => {
    expect(aggregateState(['done', 'failed', 'uncertain'])).toBe('failed');
    expect(aggregateState(['done', 'uncertain', 'active'])).toBe('uncertain');
    expect(aggregateState(['done', 'active'])).toBe('active');
    expect(aggregateState(['done', 'pending'])).toBe('done'); // POLICY waiting on its execution-time preconditions
    expect(aggregateState(['done', 'done'])).toBe('done');
    expect(aggregateState(['done', 'skipped'])).toBe('done');
    expect(aggregateState(['skipped', 'skipped'])).toBe('skipped');
    expect(aggregateState(['pending', 'skipped'])).toBe('pending');
    expect(aggregateState([])).toBe('pending');
  });

  it('stepDurations: chronological deltas, ties in pipeline order, steps without a time ignored', () => {
    const d = stepDurations([
      { id: 'a', n: 1, label: '', who: '', state: 'done', at: '2026-09-20T17:27:10Z', note: null },
      { id: 'b', n: 2, label: '', who: '', state: 'done', at: '2026-09-20T17:27:12.500Z', note: null },
      { id: 'c', n: 3, label: '', who: '', state: 'pending', at: null, note: null },
      { id: 'd', n: 4, label: '', who: '', state: 'done', at: '2026-09-20T17:27:11Z', note: null },
    ]);
    expect(Object.fromEntries(d)).toEqual({ d: 1000, b: 1500 });
  });

  it('parseInstant keeps millisecond precision of nanosecond instants', () => {
    expect(parseInstant('2026-09-20T17:27:29.158597140Z')).toBe(Date.UTC(2026, 8, 20, 17, 27, 29, 158));
    expect(parseInstant(null)).toBeNull();
    expect(parseInstant('nope')).toBeNull();
  });

  it('formatDuration', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(420)).toBe('420 ms');
    expect(formatDuration(1400)).toBe('1.4 s');
    expect(formatDuration(36_200)).toBe('36 s');
    expect(formatDuration(76_000)).toBe('1 m 16 s');
    expect(formatDuration(7_500_000)).toBe('2 h 05 m');
  });
});
