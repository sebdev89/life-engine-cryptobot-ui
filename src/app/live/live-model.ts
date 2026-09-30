/**
 * Pure model of the live-operation view (demo path §2 of
 * `CryptoBot-Hackathon-Demo-Path-2026-09-20.md`): the 12 steps a proposal walks through, derived
 * only from what the service persisted (`ProposalStatus` + the `audit_event` trail). Nothing is
 * inferred from time or guessed: a step is `done` when its audit event exists, `failed` when the
 * trail says so, `uncertain` when the service itself said it does not know (broadcast uncertain,
 * reconciliation ambiguous), `active` when it is the next thing the service will do.
 */
import { ActionProposal, AuditEvent, DeadLetter, PolicyDecision, ProposalStatus } from '../control-plane-api';
import { AnchorBatch, IntelligenceReceipt } from '../receipts-api';

export type StepState = 'pending' | 'active' | 'done' | 'failed' | 'uncertain' | 'skipped';

export interface DemoStep {
  id: string;
  /** Step number of the demo path document (§2). */
  n: number;
  label: string;
  /** Which component of the control plane does it. */
  who: string;
  state: StepState;
  /** When the audit event that closes the step was recorded. */
  at: string | null;
  /** One line of evidence from the audit payload (hash, decision, signature…). */
  note: string | null;
}

// Audit event types, as the service names them (ProposalService / ExecutionService / ReconciliationService / DeadLetterService).
export const EV = {
  CREATED: 'PROPOSAL_CREATED',
  SIMULATED: 'SIMULATED',
  POLICY: 'POLICY_EVALUATED',
  AWAITING: 'AWAITING_APPROVAL',
  BLOCKED: 'BLOCKED_BY_POLICY',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  STARTED: 'EXECUTION_STARTED',
  VALIDATED: 'EXECUTION_VALIDATED',
  SIGNED: 'EXECUTION_SIGNED',
  SUBMITTED: 'EXECUTION_SUBMITTED',
  BROADCAST_UNCERTAIN: 'EXECUTION_BROADCAST_UNCERTAIN',
  RETRIED: 'EXECUTION_RETRIED',
  CONFIRMATION_PENDING: 'EXECUTION_CONFIRMATION_PENDING',
  DUPLICATE: 'EXECUTION_DUPLICATE_SUPPRESSED',
  EXECUTED: 'EXECUTED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  RECONCILED: 'RECONCILED',
  AMBIGUOUS: 'RECONCILIATION_AMBIGUOUS',
  RETRIES_EXHAUSTED: 'RECONCILIATION_RETRIES_EXHAUSTED',
  DLQ_RESOLVED: 'DEAD_LETTER_RESOLVED',
  DLQ_REQUEUED: 'DEAD_LETTER_REQUEUED',
} as const;

const TERMINAL: ReadonlySet<string> = new Set(['BLOCKED_BY_POLICY', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED']);
const IN_FLIGHT: ReadonlySet<string> = new Set(['EXECUTING', 'SUBMITTED']);

export function isTerminal(status: ProposalStatus | string): boolean {
  return TERMINAL.has(status);
}

export function isInFlight(status: ProposalStatus | string): boolean {
  return IN_FLIGHT.has(status);
}

/** The last audit event of a type (the trail is chronological; a retry repeats VALIDATED/SIGNED/SUBMITTED). */
export function lastEvent(audit: readonly AuditEvent[], type: string): AuditEvent | null {
  for (let i = audit.length - 1; i >= 0; i--) {
    if (audit[i].eventType === type) {
      return audit[i];
    }
  }
  return null;
}

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function short(s: string | null | undefined, head = 8, tail = 6): string | null {
  if (!s) return null;
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function isAfter(a: AuditEvent | null, b: AuditEvent | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return a.createdAt > b.createdAt || (a.createdAt === b.createdAt && a.id > b.id);
}

/**
 * The demo path as the service left it. Steps are the numbered rows of §2 collapsed to what the
 * audit trail can prove; `receiptKinds` (from `/receipts`) closes the last step.
 */
export function buildTimeline(proposal: ActionProposal | null, audit: readonly AuditEvent[], receiptKinds: readonly string[] = []): DemoStep[] {
  if (!proposal) {
    return [];
  }
  const status = proposal.status;
  const ev = (t: string) => lastEvent(audit, t);
  const created = ev(EV.CREATED);
  const simulated = ev(EV.SIMULATED);
  const policy = ev(EV.POLICY);
  const awaiting = ev(EV.AWAITING);
  const blocked = ev(EV.BLOCKED);
  const approved = ev(EV.APPROVED);
  const rejected = ev(EV.REJECTED);
  const cancelled = ev(EV.CANCELLED);
  const expired = ev(EV.EXPIRED);
  const started = ev(EV.STARTED);
  const retried = ev(EV.RETRIED);
  const validated = ev(EV.VALIDATED);
  const signed = ev(EV.SIGNED);
  const submitted = ev(EV.SUBMITTED);
  const uncertain = ev(EV.BROADCAST_UNCERTAIN);
  const pending = ev(EV.CONFIRMATION_PENDING);
  const executed = ev(EV.EXECUTED);
  const execFailed = ev(EV.EXECUTION_FAILED);
  const reconciled = ev(EV.RECONCILED);
  const ambiguous = ev(EV.AMBIGUOUS);
  const exhausted = ev(EV.RETRIES_EXHAUSTED);
  const requeued = ev(EV.DLQ_REQUEUED);
  const resolved = ev(EV.DLQ_RESOLVED);

  const p = (e: AuditEvent | null) => e?.payload ?? {};
  const steps: DemoStep[] = [];
  const push = (id: string, n: number, label: string, who: string, state: StepState, e: AuditEvent | null, note: string | null) =>
    steps.push({ id, n, label, who, state, at: e?.createdAt ?? null, note });

  // 1 · intent → plan
  push('intent', 1, 'Intent → plan', 'RebalancePlanner', 'done', created, proposal.plan?.summary ?? null);

  // 2 · simulation
  push(
    'simulation',
    2,
    'Simulation (exact bytes)',
    'SimulationService · simulateTransaction',
    simulated ? 'done' : 'active',
    simulated,
    proposal.simulation?.onchain
      ? `on-chain ${proposal.simulation.onchain.ok ? 'ok' : 'would fail'}${proposal.simulation.onchain.unitsConsumed ? ` · ${proposal.simulation.onchain.unitsConsumed} CU` : ''}`
      : null,
  );

  // 3 · risk + policy
  const pp = p(policy);
  const policyNote = policy
    ? [str(pp['decision']), pp['tier'] ? `tier ${str(pp['tier'])}` : null, pp['policyHash'] ? `H_R ${short(str(pp['policyHash']), 13, 4)}` : null]
        .filter(Boolean)
        .join(' · ')
    : null;
  push(
    'policy',
    3,
    'Risk + policy (13 rules · R_v · validator identity)',
    'PolicyEngine · DeterministicPolicyEngine',
    blocked || status === 'BLOCKED_BY_POLICY' ? 'failed' : policy ? 'done' : simulated ? 'active' : 'pending',
    blocked ?? policy,
    blocked ? `BLOCKED_BY_POLICY${policyNote ? ' · ' + policyNote : ''}` : policyNote,
  );

  // 4 · human approval
  const approvalState: StepState = approved
    ? 'done'
    : rejected || status === 'REJECTED'
      ? 'failed'
      : expired || status === 'EXPIRED'
        ? 'failed'
        : blocked || status === 'BLOCKED_BY_POLICY'
          ? 'skipped'
          : awaiting || status === 'AWAITING_APPROVAL'
            ? 'active'
            : 'pending';
  const ap = proposal.approval;
  push(
    'approval',
    4,
    'Human approval',
    'POST /approve',
    approvalState,
    approved ?? rejected ?? expired,
    approved && ap ? `by ${ap.by}${ap.note ? ` — ${ap.note}` : ''}` : rejected ? `REJECTED by ${rejected.actor}` : expired ? 'EXPIRED' : null,
  );

  // 5 · timelock (executableAt from the APPROVED payload; CANCELLED inside it is a human decision)
  const executableAt = str(p(approved)['executableAt']);
  const timelockState: StepState = cancelled
    ? 'failed'
    : started
      ? 'done'
      : approved
        ? 'active'
        : approvalState === 'failed' || approvalState === 'skipped'
          ? 'skipped'
          : 'pending';
  push(
    'timelock',
    5,
    'Timelock',
    'PolicyEngine.executableAt',
    timelockState,
    // The event that closes the timelock is EXECUTION_STARTED (the first moment it was over and used).
    cancelled ?? started,
    cancelled ? `CANCELLED by ${cancelled.actor}` : executableAt ? `executable at ${executableAt.replace('T', ' ').slice(0, 19)} UTC` : null,
  );

  const failStage = str(p(execFailed)['stage']);
  const failedAtStage = (stage: string) => !!execFailed && failStage?.toLowerCase() === stage && !isAfter(retried, execFailed);
  const notReached: StepState = timelockState === 'failed' || timelockState === 'skipped' ? 'skipped' : 'pending';

  // 6 · execute: preconditions + mainnet gate (409 never leaves a trace; the row moves to EXECUTING only past the gate)
  push(
    'preconditions',
    6,
    'Execute: preconditions + mainnet gate',
    'ExecutionService · requireClusterAllowed',
    started ? 'done' : timelockState === 'active' ? 'pending' : notReached,
    retried ?? started,
    proposal.operationId ? `operationId ${proposal.operationId}${retried ? ` · retry #${str(p(retried)['retry'])}` : ''}` : null,
  );

  // 7 · independent validator
  const vp = p(validated);
  push(
    'validator',
    7,
    'Independent validator re-derives the verdict',
    'validator/ · POST /api/validator/validate',
    failedAtStage('validate') ? 'failed' : validated ? 'done' : started ? 'active' : notReached,
    execFailed && failedAtStage('validate') ? execFailed : validated,
    failedAtStage('validate')
      ? str(p(execFailed)['error'])
      : validated
        ? [
            vp['decision'] ? str(vp['decision']) : null,
            vp['validator'] ? short(str(vp['validator']), 6, 4) : null,
            vp['verdictHash'] ? `verdict ${short(str(vp['verdictHash']), 13, 4)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
  );

  // 8 · isolated signer (signature persisted before the broadcast)
  push(
    'signer',
    8,
    'Isolated signer signs these bytes',
    'signer/ · attestation required',
    failedAtStage('sign') ? 'failed' : signed ? 'done' : validated ? 'active' : notReached,
    failedAtStage('sign') ? execFailed : signed,
    failedAtStage('sign') ? str(p(execFailed)['error']) : signed ? `signature ${short(str(p(signed)['signature']))} · persisted before broadcast` : null,
  );

  // 9 · submit (sendTransaction); the service may not know whether it went out
  const submitUncertain = !!uncertain && isAfter(uncertain, submitted);
  push(
    'submit',
    9,
    'Submit (sendTransaction)',
    'SolanaRpcClient · second mainnet guard',
    submitUncertain && !executed && !reconciled ? 'uncertain' : submitted || (uncertain && (executed || reconciled)) ? 'done' : signed ? 'active' : notReached,
    submitUncertain ? uncertain : submitted,
    submitUncertain
      ? `broadcast uncertain: ${str(p(uncertain)['error']) ?? 'no answer from the RPC'}`
      : submitted
        ? `SUBMITTED · ${short(str(p(submitted)['signature']))}`
        : null,
  );

  // 10 · confirmation
  const onchainFailed =
    (status === 'FAILED' && !!execFailed && (!failStage || failStage.toLowerCase() === 'onchain')) || (!!execFailed && failStage?.toLowerCase() === 'onchain');
  const confirmState: StepState = executed
    ? 'done'
    : onchainFailed
      ? 'failed'
      : pending && isAfter(pending, submitted ?? uncertain)
        ? 'uncertain'
        : submitted || submitUncertain
          ? 'active'
          : notReached;
  push(
    'confirm',
    10,
    'Confirmation (getSignatureStatuses)',
    'ExecutionService.confirm · 1.5 s × 20',
    confirmState,
    executed ?? (onchainFailed ? execFailed : pending),
    executed
      ? `EXECUTED · ${str(p(executed)['confirmation']) ?? proposal.execution?.confirmationStatus ?? 'confirmed'}`
      : onchainFailed
        ? str(p(execFailed)['error'])
        : pending
          ? 'confirmation pending — the reconciler closes it'
          : null,
  );

  // 11 · reconciliation / recovery
  const dlqAfterRequeue = requeued && isAfter(requeued, ambiguous ?? exhausted);
  const reconcileState: StepState =
    reconciled || (retried && executed)
      ? 'done'
      : ambiguous || exhausted
        ? dlqAfterRequeue || resolved
          ? 'done'
          : 'uncertain'
        : requeued
          ? 'done'
          : isInFlight(status) || confirmState === 'uncertain'
            ? 'active'
            : executed
              ? 'skipped'
              : notReached;
  const reconcileNote = reconciled
    ? `RECONCILED ${str(p(reconciled)['from'])} → ${str(p(reconciled)['to'])}`
    : retried && executed
      ? `retried idempotently · same operationId · new signature ${short(str(p(retried)['signature']))}`
      : requeued
        ? `dead letter requeued by ${requeued.actor}`
        : resolved
          ? `dead letter resolved by ${resolved.actor}`
          : ambiguous
            ? `RECONCILIATION_AMBIGUOUS → dead letter (${str(p(ambiguous)['reason']) ?? 'no verdict from the chain'})`
            : exhausted
              ? 'retries exhausted → dead letter'
              : executed
                ? 'not needed: closed by confirmation'
                : null;
  push(
    'reconcile',
    11,
    'Reconciliation / DLQ',
    'ReconciliationService · every 30 s',
    reconcileState,
    reconciled ?? requeued ?? resolved ?? ambiguous ?? exhausted,
    reconcileNote,
  );

  // 12 · execution receipt
  const hasExecReceipt = receiptKinds.includes('EXECUTION');
  push(
    'receipt',
    12,
    'EXECUTION receipt (signed, content-addressed)',
    'ExecutionReceipts',
    hasExecReceipt ? 'done' : executed || status === 'FAILED' ? 'active' : notReached,
    null,
    hasExecReceipt ? 'verify below' : null,
  );

  // A terminal failure leaves nothing "active" behind it.
  if (isTerminal(status) && status !== 'EXECUTED') {
    for (const s of steps) {
      if (s.state === 'active' || (s.state === 'pending' && s.id !== 'receipt')) s.state = 'skipped';
    }
    const last = steps.find((s) => s.state === 'failed');
    if (!last) {
      // FAILED without an EXECUTION_FAILED event we can map: mark the first non-done step.
      const first = steps.find((s) => s.state === 'skipped');
      if (first && status === 'FAILED') first.state = 'failed';
    }
  }
  return steps;
}

// ---- the 8 product stages --------------------------------------------------------

export type StageId = 'INTENT' | 'POLICY' | 'APPROVAL' | 'SIGN' | 'EXECUTE' | 'FINALIZE' | 'RECONCILE' | 'PROVE';

/** One line of evidence; `href` when it points somewhere a judge can click (explorer). */
export interface Evidence {
  text: string;
  href: string | null;
}

export interface Stage {
  id: StageId;
  n: number;
  /** What happens in the stage, in product words. */
  label: string;
  state: StepState;
  /** Sum of the time its sub-steps took (see `stepDurations`); null when nothing in it closed yet. */
  durationMs: number | null;
  /** Active: the duration keeps growing (time since the last event, as of `now`). */
  running: boolean;
  /** When the stage closed (last `at` of its sub-steps). */
  endedAt: string | null;
  evidence: Evidence | null;
  /** The original steps of the 12-step model that make up this stage (all 12 stay reachable). */
  steps: DemoStep[];
  /** PROVE only: checks that are not one of the 12 steps (anchor batch, inclusion proof). */
  checks: DemoStep[];
}

/** INTENT · POLICY · APPROVAL · SIGN · EXECUTE · FINALIZE · RECONCILE · PROVE ← the 12 steps. */
export const STAGE_MAP: readonly { id: StageId; label: string; steps: readonly string[] }[] = [
  { id: 'INTENT', label: 'Agent intent → plan', steps: ['intent'] },
  { id: 'POLICY', label: 'Simulation · 13 rules · execution preconditions', steps: ['simulation', 'policy', 'preconditions'] },
  { id: 'APPROVAL', label: 'Human approval · timelock', steps: ['approval', 'timelock'] },
  { id: 'SIGN', label: 'Independent validator · isolated signer', steps: ['validator', 'signer'] },
  { id: 'EXECUTE', label: 'Broadcast to Solana', steps: ['submit'] },
  { id: 'FINALIZE', label: 'On-chain confirmation', steps: ['confirm'] },
  { id: 'RECONCILE', label: 'Reconciliation · dead-letter queue', steps: ['reconcile'] },
  { id: 'PROVE', label: 'Signed receipt · Merkle anchor · inclusion proof', steps: ['receipt'] },
];

/** What PROVE is built from: the EXECUTION receipt, the batch that anchors it, and the client-side proof check. */
export interface ProofInput {
  receipt: IntelligenceReceipt | null;
  /** The anchor batch (`GET /anchors/{root}` or the matching one of `GET /anchors`). */
  batch: AnchorBatch | null;
  batchExplorerUrl: string | null;
  /** Merkle siblings of the receipt (from the batch detail, else the receipt's own anchor). */
  proof: string[] | null;
  /** `merkle.inclusionProofValid`: true/false when folded, null when not (yet) checked. */
  inclusion: boolean | null;
}

export const NO_PROOF: ProofInput = { receipt: null, batch: null, batchExplorerUrl: null, proof: null, inclusion: null };

/**
 * failed if any failed · uncertain if any · active if any active · done if all done (skipped ones
 * do not hold it back) · skipped if all skipped · pending if nothing started.
 *
 * Done + pending with nothing active reads as done: the only such case is POLICY, whose
 * execution-time preconditions run after APPROVAL. They do not reopen the stage (two stages would
 * "run" at once while the human decides); if they fail, the stage fails.
 */
export function aggregateState(states: readonly StepState[]): StepState {
  if (!states.length) return 'pending';
  if (states.includes('failed')) return 'failed';
  if (states.includes('uncertain')) return 'uncertain';
  if (states.includes('active')) return 'active';
  if (states.includes('done')) return 'done';
  if (states.includes('pending')) return 'pending';
  return 'skipped';
}

/** Instant as the service renders it (nanosecond fractions included) → epoch ms. */
export function parseInstant(at: string | null | undefined): number | null {
  if (!at) return null;
  const ms = Date.parse(at.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * How long each step took: from the previous event of the run (chronologically) to the event that
 * closed it. Summing these per stage makes the stage durations add up to the whole run (human
 * approval, the timelock wait and a recovery included, where they belong), which a first→last
 * `at` inside each stage cannot do: a one-step stage would always read 0, and POLICY's
 * execution-time preconditions would stretch it across the approval. Ties keep pipeline order.
 */
export function stepDurations(steps: readonly DemoStep[]): Map<string, number> {
  const out = new Map<string, number>();
  const timed = steps
    .map((s, i) => ({ id: s.id, t: parseInstant(s.at), i }))
    .filter((x): x is { id: string; t: number; i: number } => x.t !== null)
    .sort((a, b) => a.t - b.t || a.i - b.i);
  for (let k = 1; k < timed.length; k++) out.set(timed[k].id, timed[k].t - timed[k - 1].t);
  return out;
}

/** `420 ms` · `1.4 s` · `36 s` · `1 m 16 s` · `2 h 05 m`. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  if (s < 60) return `${Math.round(s)} s`;
  const totalS = Math.round(s);
  if (totalS < 3600) return `${Math.floor(totalS / 60)} m ${String(totalS % 60).padStart(2, '0')} s`;
  return `${Math.floor(totalS / 3600)} h ${String(Math.floor((totalS % 3600) / 60)).padStart(2, '0')} m`;
}

function proveChecks(receiptStep: DemoStep | undefined, proof: ProofInput): DemoStep[] {
  const upstream = receiptStep?.state ?? 'pending';
  const notYet: StepState = upstream === 'skipped' ? 'skipped' : 'pending';
  const b = proof.batch;
  const receiptAnchored = !!proof.receipt?.anchor?.tx;
  const batchState: StepState = !proof.receipt
    ? notYet
    : b?.status === 'FINALIZED' || (!b && receiptAnchored)
      ? 'done'
      : b?.status === 'FAILED' || b?.status === 'ABANDONED'
        ? 'failed'
        : 'active';
  const root = b?.root ?? proof.receipt?.anchor?.root ?? null;
  const tx = b?.tx ?? proof.receipt?.anchor?.tx ?? null;
  const slot = b?.slot ?? proof.receipt?.anchor?.slot ?? null;
  const anchor: DemoStep = {
    id: 'anchor',
    n: 13,
    label: 'Merkle root anchored on devnet (memo tx)',
    who: 'AnchorService · GET /anchors/{root}',
    state: batchState,
    at: b?.finalizedAt ?? null,
    note:
      batchState === 'done'
        ? `root ${short(root, 13, 4)} · ${b?.receiptCount ?? '?'} receipts · slot ${slot ?? '—'} · tx ${short(tx)}`
        : batchState === 'failed'
          ? `batch ${b?.status}`
          : proof.receipt
            ? b
              ? `batch ${b.status} · waiting for finality`
              : 'waiting for the next anchoring batch'
            : null,
  };
  const inclusionState: StepState =
    batchState !== 'done' ? (batchState === 'failed' ? 'skipped' : notYet) : proof.inclusion === true ? 'done' : proof.inclusion === false ? 'failed' : 'active';
  const inclusion: DemoStep = {
    id: 'inclusion',
    n: 14,
    label: 'Inclusion proof folds to the root (checked in this browser)',
    who: 'merkle.ts · SHA-256(0x00‖leaf), SHA-256(0x01‖L‖R)',
    state: inclusionState,
    at: null,
    note:
      proof.inclusion === true
        ? `receipt ∈ root · ${proof.proof?.length ?? 0} sibling(s) · valid`
        : proof.inclusion === false
          ? 'proof does NOT fold to the anchored root'
          : batchState === 'done'
            ? 'not checked here (needs WebCrypto) — use Verify below'
            : null,
  };
  return [anchor, inclusion];
}

function evidenceFor(
  id: StageId,
  steps: readonly DemoStep[],
  checks: readonly DemoStep[],
  proposal: ActionProposal | null,
  proof: ProofInput,
  deadLetters: readonly Pick<DeadLetter, 'id' | 'resolvedAt'>[],
): Evidence | null {
  const all = [...steps, ...checks];
  const bad = all.find((s) => (s.state === 'failed' || s.state === 'uncertain') && s.note);
  const explorer = proposal ? explorerTxUrlFor(proposal.cluster, proposal.execution?.signature, proposal.execution?.explorerUrl) : null;
  const note = (sid: string) => all.find((s) => s.id === sid)?.note ?? null;
  const line = (text: string | null, href: string | null = null): Evidence | null => (text ? { text, href } : null);
  if (id === 'RECONCILE' && deadLetters.length) {
    const open = deadLetters.find((d) => !d.resolvedAt);
    const dl = open ?? deadLetters[0];
    return line(`dead letter ${shortId(dl.id)} ${open ? 'open' : 'closed'}${note('reconcile') ? ' · ' + note('reconcile') : ''}`);
  }
  if (bad) return line(bad.note);
  switch (id) {
    case 'INTENT':
      return line(note('intent'));
    case 'POLICY':
      return line(note('policy') ?? note('simulation'));
    case 'APPROVAL':
      return line(note('approval') ?? note('timelock'));
    case 'SIGN': {
      const sig = proposal?.execution?.signature;
      return sig && all.find((s) => s.id === 'signer')?.state === 'done' ? line(`signature ${shortSig(sig)}`, explorer) : line(note('validator'));
    }
    case 'EXECUTE':
      return line(note('submit'), all.find((s) => s.id === 'submit')?.state === 'done' ? explorer : null);
    case 'FINALIZE':
      return line(note('confirm'), all.find((s) => s.id === 'confirm')?.state === 'done' ? explorer : null);
    case 'RECONCILE':
      return line(note('reconcile'));
    case 'PROVE': {
      if (proof.inclusion === true) {
        const root = proof.batch?.root ?? proof.receipt?.anchor?.root ?? null;
        return line(`inclusion proof valid · root ${short(root, 13, 4)}`, proof.batchExplorerUrl);
      }
      return line(note('anchor') ?? (proof.receipt ? `EXECUTION receipt ${short(proof.receipt.receiptHash, 13, 4)}` : null), proof.batchExplorerUrl);
    }
  }
}

/**
 * The 12 steps regrouped into the 8 stages of the product, each with an aggregated state, a
 * duration, one line of evidence and its original steps. `now` (epoch ms) lets an active stage
 * show its running time; pure otherwise.
 */
export function buildStages(
  proposal: ActionProposal | null,
  steps: readonly DemoStep[],
  proof: ProofInput = NO_PROOF,
  deadLetters: readonly Pick<DeadLetter, 'id' | 'resolvedAt'>[] = [],
  now: number | null = null,
): Stage[] {
  if (!steps.length) return [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  // PROVE closes when the receipt is written: give step 12 the receipt's time for the duration.
  const receiptStep = byId.get('receipt');
  const timed: DemoStep[] = steps.map((s) => (s.id === 'receipt' && proof.receipt && s.state === 'done' ? { ...s, at: proof.receipt.createdAt } : s));
  const checks = proveChecks(receiptStep, proof);
  const durations = stepDurations([...timed, ...checks]);
  const timedById = new Map([...timed, ...checks].map((s) => [s.id, s]));
  let lastAt: number | null = null;
  for (const s of [...timed, ...checks]) {
    const t = parseInstant(s.at);
    if (t !== null) lastAt = lastAt === null ? t : Math.max(lastAt, t);
  }

  return STAGE_MAP.map((def, i) => {
    const own = def.steps.map((id) => byId.get(id)).filter((s): s is DemoStep => !!s);
    const extra = def.id === 'PROVE' ? checks : [];
    const state = aggregateState([...own, ...extra].map((s) => s.state));
    const members = [...def.steps, ...extra.map((c) => c.id)];
    const measured = members.filter((id) => durations.has(id));
    let durationMs: number | null = measured.length ? measured.reduce((n, id) => n + durations.get(id)!, 0) : null;
    const running = state === 'active';
    if (running && now !== null && lastAt !== null) durationMs = (durationMs ?? 0) + Math.max(0, now - lastAt);
    const ends = members.map((id) => timedById.get(id)?.at ?? null).filter((a): a is string => !!a);
    return {
      id: def.id,
      n: i + 1,
      label: def.label,
      state,
      durationMs,
      running,
      endedAt: ends.length ? ends.reduce((a, b) => ((parseInstant(b) ?? 0) > (parseInstant(a) ?? 0) ? b : a)) : null,
      evidence: evidenceFor(def.id, own, extra, proposal, proof, deadLetters),
      steps: own,
      checks: extra,
    };
  });
}

/** Wall time from the first to the last event of the run (what the header shows). */
export function totalDuration(stages: readonly Stage[]): number | null {
  const sum = stages.reduce((n, s) => n + (s.durationMs ?? 0), 0);
  return stages.some((s) => s.durationMs !== null) ? sum : null;
}

// ---- policy ---------------------------------------------------------------------------------

export interface PolicyRow {
  rule: string;
  state: 'pass' | 'blocked' | 'not-executable';
  message: string | null;
}

/** Every rule the engine applied, with what it said. Blocked ⇒ BLOCKED_BY_POLICY; not-executable ⇒ paper trade / 409 at execute. */
export function policyRows(decision: PolicyDecision | null | undefined): PolicyRow[] {
  if (!decision) return [];
  const blocked = new Map(decision.violations.map((v) => [v.rule, v.message]));
  const notExec = new Map(decision.executionViolations.map((v) => [v.rule, v.message]));
  const rules = [...decision.rulesApplied];
  for (const r of [...blocked.keys(), ...notExec.keys()]) {
    if (!rules.includes(r)) rules.push(r);
  }
  return rules.map((rule) => ({
    rule,
    state: blocked.has(rule) ? 'blocked' : notExec.has(rule) ? 'not-executable' : 'pass',
    message: blocked.get(rule) ?? notExec.get(rule) ?? null,
  }));
}

export interface PredicateRow {
  predicate: string;
  failed: boolean;
}

export function predicateRows(decision: PolicyDecision | null | undefined): PredicateRow[] {
  const v = decision?.authorization;
  if (!v) return [];
  const failed = new Set(v.failedPredicates);
  return v.evaluatedPredicates.map((predicate) => ({ predicate, failed: failed.has(predicate) }));
}

/** The wallet is on mainnet ⇒ `EXECUTION_CLUSTER` is an execution violation and `execute` is a 409 (fail-closed). */
export function isMainnetFailClosed(proposal: Pick<ActionProposal, 'cluster' | 'policy'> | null | undefined): boolean {
  if (!proposal) return false;
  const onMainnet = proposal.cluster.toLowerCase().startsWith('mainnet');
  const clusterViolation = (proposal.policy?.executionViolations ?? []).some((v) => v.rule === 'EXECUTION_CLUSTER');
  return onMainnet || clusterViolation;
}

// ---- execution / chain --------------------------------------------------------------------

/** Same rule as `SolanaCluster.explorerTxUrl`: devnet carries `?cluster=devnet`, mainnet nothing. Prefers the URL the service stored. */
export function explorerTxUrlFor(cluster: string | null | undefined, signature: string | null | undefined, stored?: string | null): string | null {
  if (stored) return stored;
  if (!signature) return null;
  const c = (cluster ?? '').toLowerCase();
  const suffix = c.startsWith('mainnet') ? '' : c === 'testnet' ? '?cluster=testnet' : '?cluster=devnet';
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

// ---- errors ---------------------------------------------------------------------------------

export interface ApiFailure {
  status: number | null;
  code: string | null;
  message: string;
  /** 409: the control plane refused (not approved, timelock, mainnet fail-closed, stale, already resolved). */
  conflict: boolean;
}

/** What `throwHttp` attached, flattened for the "last answer of the control plane" box. */
export function describeFailure(e: unknown): ApiFailure {
  const err = e as { apiError?: { status?: number; code?: string; message?: string }; message?: string } | null;
  const api = err?.apiError;
  const status = typeof api?.status === 'number' ? api.status : null;
  return {
    status,
    code: api?.code ?? null,
    message: api?.message ?? (e instanceof Error ? e.message : String(e)),
    conflict: status === 409,
  };
}

// ---- dead letters ---------------------------------------------------------------------------

/** `ambiguous` / `retries_exhausted` / `inconsistent` for reconciliation letters; `outbox` otherwise. */
export function deadLetterKind(dl: Pick<DeadLetter, 'source' | 'payload'>): string {
  const kind = dl.payload?.['kind'];
  if (typeof kind === 'string' && kind) return kind;
  return dl.source.toLowerCase();
}

/** Whether a reload of the heavy panels (lineage, receipts) is due: only when the row itself moved. */
export function proposalChanged(prev: ActionProposal | null, next: ActionProposal): boolean {
  return !prev || prev.id !== next.id || prev.status !== next.status || prev.updatedAt !== next.updatedAt;
}

/** The keys of an audit payload worth one line on screen, in the order the demo reads them. */
const FACT_KEYS: readonly string[] = [
  'decision',
  'tier',
  'escalation',
  'policyHash',
  'verdictHash',
  'validator',
  'signature',
  'previousSignature',
  'retry',
  'confirmation',
  'from',
  'to',
  'operationId',
  'executableAt',
  'stage',
  'error',
  'reason',
  'note',
  'kind',
  'outcome',
  'deadLetterId',
];

export function auditFacts(e: Pick<AuditEvent, 'payload'>): string {
  const out: string[] = [];
  for (const k of FACT_KEYS) {
    const v = e.payload?.[k];
    if (v === null || v === undefined || v === '') continue;
    const text = typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v);
    const compact = k === 'signature' || k === 'previousSignature' ? shortSig(text) : text.length > 80 ? `${text.slice(0, 77)}…` : text;
    out.push(`${k}=${compact}`);
  }
  return out.join(' · ');
}

export function shortId(id: string | null | undefined, n = 8): string {
  return id ? id.slice(0, n) : '—';
}

export function shortSig(s: string | null | undefined): string {
  return s ? `${s.slice(0, 8)}…${s.slice(-6)}` : '—';
}

export function newOperationId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for very old browsers: RFC 4122 v4 from Math.random (demo only).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
