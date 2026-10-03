/**
 * Pure model of the Control Tower. Every number is counted from what the API returned —
 * `GET /proposals`, `GET /dead-letters?resolved=all`, `GET /anchors` — and nothing is estimated.
 * A metric whose source is unavailable (403 without RUNTIME_ADMIN, network) is `null` and the
 * UI says why, instead of printing a zero. "Duplicate prevented" is deliberately absent: the
 * service counts it only in Prometheus (`duplicate_trade_suppressed_total`); no endpoint or audit
 * event carries it, so the UI has nothing real to count.
 */
import { ActionProposal, DeadLetter } from '../control-plane-api';
import { AnchorView } from '../receipts-api';
import { Stage, StageId, StepState, parseInstant } from '../live/live-model';

/** `GET /proposals` answers at most this many rows (ActionProposalR2dbcStore clamps the limit). */
export const PROPOSALS_API_MAX = 100;
/** `GET /anchors` clamps at 200. */
export const ANCHORS_API_MAX = 200;
/** `GET /dead-letters` clamps at 500. */
export const DEAD_LETTERS_API_MAX = 500;

export interface TowerInput {
  proposals: readonly ActionProposal[];
  /** Null when `/dead-letters` was not readable (needs RUNTIME_ADMIN). */
  deadLetters: { deadLetters: readonly DeadLetter[]; open: number } | null;
  /** Null when `/anchors` was not readable. */
  anchors: readonly AnchorView[] | null;
}

export interface TowerKpis {
  /** Proposals counted (the API window). `capped` when the window may hide older rows. */
  window: number;
  capped: boolean;
  /** Proposals whose execute was attempted: the operationId is set in the same commit that moves the row to EXECUTING. */
  executions: number;
  /** EXECUTED: the transaction reached the confirmation level the service requires. */
  finalized: number;
  inFlight: number;
  failed: number;
  /** EXECUTED proposals that went through the dead-letter queue first. Null without `/dead-letters`. */
  recovered: number | null;
  /** Global unresolved dead letters (`open` of the page = `cryptobot_dead_letter_open`). */
  dlqOpen: number | null;
  /** All dead letters seen (open + resolved + requeued). */
  dlqTotal: number | null;
  /** Idempotent retries under the same operationId (sum of `execution.retries`). */
  retries: number;
  /** Proposals that needed at least one retry. */
  retriedProposals: number;
  /** FINALIZED anchor batches (Merkle roots on chain) and the receipts they cover. */
  proofs: number | null;
  anchoredReceipts: number | null;
  /** Mean wall time from the intent (proposal created) to EXECUTED (execution confirmed), human approval and timelock included. */
  latencyMeanMs: number | null;
  latencyN: number;
}

export function computeKpis(input: TowerInput): TowerKpis {
  const ps = input.proposals;
  const executed = ps.filter((p) => p.status === 'EXECUTED');
  const dls = input.deadLetters;
  const dlProposals = dls ? new Set(dls.deadLetters.map((d) => d.proposalId).filter((id): id is string => !!id)) : null;
  const latencies = executed
    .map((p) => {
      const from = parseInstant(p.createdAt);
      const to = parseInstant(p.execution?.confirmedAt);
      return from !== null && to !== null && to >= from ? to - from : null;
    })
    .filter((ms): ms is number => ms !== null);
  const finalizedAnchors = input.anchors ? input.anchors.filter((a) => a.anchor.status === 'FINALIZED') : null;
  return {
    window: ps.length,
    capped: ps.length >= PROPOSALS_API_MAX,
    executions: ps.filter((p) => !!p.operationId).length,
    finalized: executed.length,
    inFlight: ps.filter((p) => p.status === 'EXECUTING' || p.status === 'SUBMITTED').length,
    failed: ps.filter((p) => p.status === 'FAILED').length,
    recovered: dlProposals ? executed.filter((p) => dlProposals.has(p.id)).length : null,
    dlqOpen: dls ? dls.open : null,
    dlqTotal: dls ? dls.deadLetters.length : null,
    retries: ps.reduce((n, p) => n + (p.execution?.retries ?? 0), 0),
    retriedProposals: ps.filter((p) => (p.execution?.retries ?? 0) > 0).length,
    proofs: finalizedAnchors ? finalizedAnchors.length : null,
    anchoredReceipts: finalizedAnchors ? finalizedAnchors.reduce((n, a) => n + a.anchor.receiptCount, 0) : null,
    latencyMeanMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    latencyN: latencies.length,
  };
}

// ---- the table of latest executions ---------------------------------------------------------

/** Where a proposal is now: the first stage still moving (or stuck), else the last one that closed. */
export interface Phase {
  id: StageId;
  n: number;
  state: StepState;
}

export function currentPhase(stages: readonly Stage[]): Phase | null {
  if (!stages.length) return null;
  const moving = stages.find((s) => s.state === 'failed' || s.state === 'uncertain' || s.state === 'active');
  if (moving) return { id: moving.id, n: moving.n, state: moving.state };
  const done = [...stages].reverse().find((s) => s.state === 'done');
  if (done) return { id: done.id, n: done.n, state: 'done' };
  return { id: stages[0].id, n: 1, state: stages[0].state };
}

/** `SELL 0.7864 SOL → vault (SOL)` (+1 leg); on-chain the leg is a SOL transfer to the agent's own vault, not a swap; the title when the plan has no legs. */
export function intentLine(p: Pick<ActionProposal, 'plan' | 'title'>): string {
  const legs = p.plan?.legs ?? [];
  if (!legs.length) return p.title;
  const l = legs[0];
  const amount = Number.isFinite(l.amount) ? Number(l.amount.toFixed(4)).toString() : String(l.amount);
  const first = `${l.action} ${amount} ${l.symbol} → vault (SOL)`;
  return legs.length > 1 ? `${first} (+${legs.length - 1} leg${legs.length > 2 ? 's' : ''})` : first;
}

export function usd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** `ALLOW · AUTONOMOUS`, or the legacy boolean on rows older than the graduated verdict. */
export function policyLine(p: Pick<ActionProposal, 'policy'>): { text: string; ok: boolean | null } {
  const d = p.policy;
  if (!d) return { text: '—', ok: null };
  const a = d.authorization;
  if (a) return { text: `${a.decision} · ${a.tier.replace('_', ' ')}`, ok: a.decision === 'ALLOW' ? true : a.decision === 'DENY' ? false : null };
  return { text: d.allowed ? 'ALLOW' : 'DENY', ok: d.allowed };
}

export function approvalLine(p: Pick<ActionProposal, 'approval' | 'status'>): { text: string; ok: boolean | null } {
  if (p.approval) return { text: p.approval.decision, ok: p.approval.decision === 'APPROVED' };
  if (p.status === 'AWAITING_APPROVAL') return { text: 'awaiting human', ok: null };
  if (p.status === 'BLOCKED_BY_POLICY') return { text: 'not requested (blocked)', ok: false };
  return { text: '—', ok: null };
}

/** Rows of the table: newest first; executions only unless `all`. */
export function latestRows(proposals: readonly ActionProposal[], n: number, all = false): ActionProposal[] {
  return [...proposals]
    .filter((p) => all || !!p.operationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, n);
}

/** The dead letters of one proposal, from the global page already loaded (no extra call). */
export function lettersOf(deadLetters: readonly DeadLetter[] | null | undefined, proposalId: string): DeadLetter[] {
  return (deadLetters ?? []).filter((d) => d.proposalId === proposalId);
}
