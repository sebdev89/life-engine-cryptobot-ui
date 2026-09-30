import { describe, expect, it } from 'vitest';
import { ActionProposal, DeadLetter } from '../control-plane-api';
import { actionError, attemptsOf, countLetters, letterKind, letterState, recoveryHistory, sortLetters } from './recovery-model';

// Shapes of cryptobot-demo-main after Scenario B (2026-09-30): chaos rpc-down → 3 reconciliation
// attempts → dead letter → requeue → idempotent retry → EXECUTED.
function letter(id: string, over: Partial<DeadLetter> = {}): DeadLetter {
  return {
    id,
    source: 'RECONCILIATION',
    refId: `p-${id}`,
    proposalId: `p-${id}`,
    ownerUserId: 'u1',
    reason: 'No verdict after 3 reconciliation attempts (RPC unavailable: chaos: rpc down)',
    payload: { kind: 'ambiguous', status: 'EXECUTING', operationId: 'op' },
    createdAt: '2026-09-30T02:56:28.284Z',
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    outcome: null,
    ...over,
  };
}

function proposal(id: string, status: ActionProposal['status'], confirmedAt: string | null = null, retries = 0): ActionProposal {
  return {
    id,
    status,
    execution: confirmedAt
      ? { status: 'EXECUTED', signature: 'sig', explorerUrl: null, signerPublicKey: null, submittedAt: null, confirmedAt, confirmationStatus: 'confirmed', error: null, retries, reconciliationAttempts: 0 }
      : null,
  } as ActionProposal;
}

const requeued = letter('a', { resolvedAt: '2026-09-30T02:56:30.143Z', resolvedBy: 'demo@cryptobot.local', resolution: 'RPC is back', outcome: 'REQUEUED' });
const resolved = letter('b', { createdAt: '2026-09-30T02:00:00.000Z', resolvedAt: '2026-09-30T02:00:10.000Z', outcome: 'RESOLVED' });
const open1 = letter('c', { createdAt: '2026-09-30T03:00:00.000Z' });
const open2 = letter('d', { createdAt: '2026-09-30T02:59:00.000Z', source: 'OUTBOX', payload: {} });

describe('letterState / letterKind', () => {
  it('reads OPEN, REQUEUED and RESOLVED from resolvedAt + outcome', () => {
    expect(letterState(open1)).toBe('OPEN');
    expect(letterState(requeued)).toBe('REQUEUED');
    expect(letterState(resolved)).toBe('RESOLVED');
  });

  it('uses payload.kind and falls back to the source', () => {
    expect(letterKind(open1)).toBe('ambiguous');
    expect(letterKind(open2)).toBe('outbox');
  });
});

describe('countLetters', () => {
  it('counts decided letters and recoveries only when the proposal is visible and EXECUTED', () => {
    const c = countLetters([requeued, resolved, open1, open2], 2, [proposal('p-a', 'EXECUTED', '2026-09-30T02:56:40.000Z'), proposal('p-b', 'FAILED')]);
    expect(c).toEqual({ open: 2, total: 4, requeued: 1, resolved: 1, recovered: 1, meanDecisionMs: Math.round((1859 + 10000) / 2) });
  });

  it('keeps the mean null when nothing was decided', () => {
    expect(countLetters([open1], 1, []).meanDecisionMs).toBeNull();
  });
});

describe('sortLetters', () => {
  it('puts open letters first, oldest first, then decided ones newest first', () => {
    expect(sortLetters([resolved, open1, requeued, open2]).map((d) => d.id)).toEqual(['d', 'c', 'a', 'b']);
  });
});

describe('attemptsOf', () => {
  it('reads reconciliation attempts and retries from the proposal, null when not visible', () => {
    expect(attemptsOf(proposal('p-a', 'EXECUTED', '2026-09-30T02:56:40.000Z', 1))).toEqual({ reconciliation: 0, retries: 1 });
    expect(attemptsOf(undefined)).toEqual({ reconciliation: null, retries: null });
  });
});

describe('recoveryHistory', () => {
  it('lists decided letters whose proposal ended EXECUTED, with decision and recovery time', () => {
    const h = recoveryHistory([requeued, resolved, open1], [proposal('p-a', 'EXECUTED', '2026-09-30T02:56:40.284Z'), proposal('p-b', 'FAILED'), proposal('p-c', 'EXECUTED', 'x')]);
    expect(h.map((e) => e.letter.id)).toEqual(['a']);
    expect(h[0].decisionMs).toBe(1859);
    expect(h[0].recoveryMs).toBe(12000);
  });
});

describe('actionError', () => {
  it('names the role on 403 and keeps the server message otherwise', () => {
    expect(actionError({ apiError: { status: 403 } })).toContain('RUNTIME_ADMIN');
    expect(actionError({ apiError: { status: 409, message: 'already resolved' } })).toBe('Conflict (409): already resolved.');
    expect(actionError(new Error('Failed to fetch'))).toBe('API not reachable: Failed to fetch');
  });
});
