/**
 * `/recovery`: the dead-letter queue as an operator reads it. Everything here is derived
 * from two API reads — `GET /dead-letters?resolved=all` (global, RUNTIME_ADMIN) and
 * `GET /proposals` (this operator's) — and nothing is estimated: a letter whose proposal belongs to
 * another operator shows its proposal as unknown, not as a guess.
 */
import { ActionProposal, DeadLetter } from '../control-plane-api';

export type LetterState = 'OPEN' | 'REQUEUED' | 'RESOLVED';

export function letterState(dl: Pick<DeadLetter, 'resolvedAt' | 'outcome'>): LetterState {
  if (!dl.resolvedAt) return 'OPEN';
  return dl.outcome === 'REQUEUED' ? 'REQUEUED' : 'RESOLVED';
}

/** The bounded label the service writes in `payload.kind` (`ambiguous`, `retries-exhausted`, `outbox`…). */
export function letterKind(dl: Pick<DeadLetter, 'payload' | 'source'>): string {
  const k = dl.payload?.['kind'];
  return typeof k === 'string' && k ? k : dl.source.toLowerCase();
}

export interface RecoveryCounts {
  /** Unresolved, system-wide (the API's own `open`, = `cryptobot_dead_letter_open`). */
  open: number;
  /** Letters in the page read (resolved=all, capped by `limit`). */
  total: number;
  requeued: number;
  resolved: number;
  /** Decided letters whose proposal this operator can see and that ended EXECUTED. */
  recovered: number;
  /** Mean created → decided, over decided letters; null when none was decided. */
  meanDecisionMs: number | null;
}

function ms(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const d = Date.parse(b) - Date.parse(a);
  return Number.isFinite(d) && d >= 0 ? d : null;
}

export function countLetters(letters: readonly DeadLetter[], open: number, proposals: readonly ActionProposal[]): RecoveryCounts {
  const byId = new Map(proposals.map((p) => [p.id, p]));
  let requeued = 0;
  let resolved = 0;
  let recovered = 0;
  const decided: number[] = [];
  for (const dl of letters) {
    const st = letterState(dl);
    if (st === 'OPEN') continue;
    if (st === 'REQUEUED') requeued++;
    else resolved++;
    if (dl.proposalId && byId.get(dl.proposalId)?.status === 'EXECUTED') recovered++;
    const d = ms(dl.createdAt, dl.resolvedAt);
    if (d !== null) decided.push(d);
  }
  return {
    open,
    total: letters.length,
    requeued,
    resolved,
    recovered,
    meanDecisionMs: decided.length ? Math.round(decided.reduce((a, b) => a + b, 0) / decided.length) : null,
  };
}

/** Open letters first (oldest open on top: it has waited longest), then decided ones newest first. */
export function sortLetters(letters: readonly DeadLetter[]): DeadLetter[] {
  const open = letters.filter((d) => !d.resolvedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = letters.filter((d) => !!d.resolvedAt).sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));
  return [...open, ...done];
}

/**
 * What the table says about the attempts behind a letter. Reconciliation letters carry the count in
 * the proposal (`execution.reconciliationAttempts`, and `retries` for idempotent re-sends under the
 * same operationId); outbox letters only in the reason text the service wrote. Unknown stays null.
 */
export interface Attempts {
  reconciliation: number | null;
  retries: number | null;
}

export function attemptsOf(proposal: ActionProposal | undefined): Attempts {
  const ex = proposal?.execution;
  return {
    reconciliation: ex?.reconciliationAttempts ?? null,
    retries: ex ? (ex.retries ?? 0) : null,
  };
}

export interface RecoveryEntry {
  letter: DeadLetter;
  proposal: ActionProposal;
  decisionMs: number | null;
  /** created → proposal confirmed on chain, when the confirmation came after the letter. */
  recoveryMs: number | null;
}

/** Decided letters whose proposal ended EXECUTED: the recoveries, newest decision first. */
export function recoveryHistory(letters: readonly DeadLetter[], proposals: readonly ActionProposal[]): RecoveryEntry[] {
  const byId = new Map(proposals.map((p) => [p.id, p]));
  const out: RecoveryEntry[] = [];
  for (const dl of letters) {
    if (!dl.resolvedAt || !dl.proposalId) continue;
    const p = byId.get(dl.proposalId);
    if (!p || p.status !== 'EXECUTED') continue;
    out.push({ letter: dl, proposal: p, decisionMs: ms(dl.createdAt, dl.resolvedAt), recoveryMs: ms(dl.createdAt, p.execution?.confirmedAt) });
  }
  return out.sort((a, b) => (b.letter.resolvedAt ?? '').localeCompare(a.letter.resolvedAt ?? ''));
}

/** Why an action on a letter failed, in words an operator can act on. */
export function actionError(e: unknown): string {
  const err = (e as { apiError?: { status?: number; message?: string } } | null)?.apiError;
  const status = err?.status;
  if (status === 403) return 'Forbidden (403): requeue and resolve need the RUNTIME_ADMIN role.';
  if (status === 404) return 'Not found (404): the letter no longer exists.';
  if (status === 409) return `Conflict (409): ${err?.message ?? 'the letter was already decided'}.`;
  if (status) return `HTTP ${status}: ${err?.message ?? 'request failed'}`;
  return `API not reachable: ${(e as Error)?.message ?? e}`;
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—';
}
