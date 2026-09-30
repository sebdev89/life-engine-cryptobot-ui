import { Component, DestroyRef, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  ActionProposal,
  AuditEvent,
  DeadLetter,
  ProposalEvents,
  cancelProposal,
  decideProposal,
  executeProposal,
  getProposal,
  getProposalEvents,
  listAllProposals,
} from '../control-plane-api';
import { AuthRequiredError } from '../cryptobot-api';
import { getProposalLineage } from '../lineage-api';
import { IntelligenceReceipt, listProposalReceipts } from '../receipts-api';
import { loadProof } from './proof-loader';
import { proofLinkOf } from '../proof/proof-model';
import { ExecutionDetail } from './execution-detail/execution-detail';
import { TopNav } from '../shell/top-nav';
import {
  CHAOS_MODES,
  ChaosMode,
  ChaosView,
  DeadLetterPage,
  DeadLetterResolution,
  armChaos,
  disarmChaos,
  getChaos,
  listDeadLetters,
  requeueDeadLetter,
  resolveDeadLetter,
} from '../reliability-api';
import { getAccessToken } from '../session';
import { Lineage } from '../lineage/lineage';
import { Receipts } from '../receipts/receipts';
import {
  ApiFailure,
  auditFacts,
  NO_PROOF,
  ProofInput,
  buildStages,
  buildTimeline,
  deadLetterKind,
  formatDuration,
  describeFailure,
  explorerTxUrlFor,
  isMainnetFailClosed,
  isTerminal,
  newOperationId,
  policyRows,
  predicateRows,
  proposalChanged,
  shortId,
  shortSig,
  totalDuration,
} from './live-model';

const DEFAULT_POLL_MS = 2000;
/** While an EXECUTED proposal waits for its anchor, PROVE is re-read every N ticks (≈10 s at 2 s). */
const PROOF_EVERY_TICKS = 5;

/** What the control plane answered to the last click — the 409s are the demo, not an error to hide. */
export interface LastAnswer {
  at: string;
  action: string;
  ok: boolean;
  status: number | null;
  code: string | null;
  message: string;
}

/**
 * The hackathon demo path (HK-8) as one live screen, without a console: the state
 * timeline of a proposal (polling every 2 s — the service exposes no SSE for proposals), the
 * policy/risk decision with rules and violations (incl. the mainnet 409), the signature with its
 * explorer link, the receipts with `verify` and the lineage DAG, the outbox + dead
 * letters of the proposal, the global DLQ with resolve/requeue, and — only when the
 * backend exposes `/demo/chaos` — the fault-injection control. No business feature is new here:
 * every button maps to an endpoint that already exists in `cryptobot-service` main.
 */
@Component({
  selector: 'app-live-operation',
  standalone: true,
  imports: [RouterLink, SlicePipe, Lineage, Receipts, ExecutionDetail, TopNav],
  templateUrl: './live.html',
  styleUrl: './live.scss',
})
export class LiveOperation implements OnInit {
  /** Route param (`/live/:proposalId`), bound by `withComponentInputBinding`. */
  readonly proposalId = input<string | null>(null);
  /**
   * Polling interval; the demo runs at 2 s, tests set it to 0 to disable the timer. `undefined`
   * means the default: `withComponentInputBinding` sets every input from the route, and an input
   * the route does not carry arrives as `undefined` (it does not keep the declared default).
   */
  readonly pollMs = input<number | undefined>(DEFAULT_POLL_MS);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly chaosModes = CHAOS_MODES;

  // ---- proposal under observation ----
  readonly proposals = signal<ActionProposal[]>([]);
  readonly proposal = signal<ActionProposal | null>(null);
  readonly audit = signal<AuditEvent[]>([]);
  readonly events = signal<ProposalEvents | null>(null);
  readonly receiptKinds = signal<string[]>([]);
  /** PROVE: EXECUTION receipt + its anchor batch + the inclusion proof folded here. */
  readonly proof = signal<ProofInput>(NO_PROOF);
  readonly proofLink = computed(() => proofLinkOf(this.proof()));
  readonly loadError = signal<string | null>(null);
  /** Bumped when the row moved (status/updatedAt) so lineage + receipts reload — not on every tick. */
  readonly panelsVersion = signal(0);
  /** `GET /proposals/{id}/lineage` answers 404 on a service without the lineage API: the DAG is hidden, not errored. */
  readonly lineageAvailable = signal(true);

  // ---- liveness ----
  readonly paused = signal(false);
  readonly lastTick = signal<Date | null>(null);
  readonly ticking = signal(false);

  // ---- actions ----
  readonly busy = signal(false);
  readonly lastAnswer = signal<LastAnswer | null>(null);
  private readonly operationIds = new Map<string, string>();

  // ---- DLQ (global, admin) ----
  readonly dlq = signal<DeadLetterPage | null>(null);
  readonly dlqForbidden = signal(false);
  readonly dlqError = signal<string | null>(null);
  readonly dlqConfirm = signal<{ id: string; action: 'resolve' | 'requeue' } | null>(null);
  readonly dlqNote = signal('');
  readonly dlqLast = signal<{ action: string; resolution: DeadLetterResolution } | null>(null);
  readonly dlqBusy = signal<string | null>(null);

  // ---- chaos (demo only) ----
  readonly chaos = signal<ChaosView | null>(null);
  readonly chaosAvailable = signal(false);
  readonly chaosMode = signal<ChaosMode>('rpc-down');
  readonly chaosShots = signal(-1);
  readonly chaosBusy = signal(false);
  readonly chaosError = signal<string | null>(null);

  // ---- derived ----
  readonly timeline = computed(() => buildTimeline(this.proposal(), this.audit(), this.receiptKinds()));
  readonly policyRows = computed(() => policyRows(this.proposal()?.policy));
  readonly predicateRows = computed(() => predicateRows(this.proposal()?.policy));
  readonly mainnetFailClosed = computed(() => isMainnetFailClosed(this.proposal()));
  readonly explorerUrl = computed(() => {
    const p = this.proposal();
    return p ? explorerTxUrlFor(p.cluster, p.execution?.signature, p.execution?.explorerUrl) : null;
  });
  readonly previousExplorerUrl = computed(() => {
    const p = this.proposal();
    return p?.execution?.previousSignature ? explorerTxUrlFor(p.cluster, p.execution.previousSignature) : null;
  });
  readonly operationId = computed(() => {
    const p = this.proposal();
    return p ? (p.operationId ?? this.operationIds.get(p.id) ?? null) : null;
  });
  readonly stages = computed(() =>
    buildStages(this.proposal(), this.timeline(), this.proof(), this.events()?.deadLetters ?? [], this.lastTick()?.getTime() ?? null),
  );
  readonly doneStages = computed(() => this.stages().filter((s) => s.state === 'done').length);
  readonly totalTime = computed(() => formatDuration(totalDuration(this.stages())));
  readonly terminal = computed(() => {
    const p = this.proposal();
    return !!p && isTerminal(p.status);
  });
  readonly openLetters = computed(() => (this.dlq()?.deadLetters ?? []).filter((d) => !d.resolvedAt));
  readonly resolvedLetters = computed(() => (this.dlq()?.deadLetters ?? []).filter((d) => !!d.resolvedAt).slice(0, 5));

  readonly shortId = shortId;
  readonly shortSig = shortSig;
  readonly auditFacts = auditFacts;
  readonly deadLetterKind = deadLetterKind;

  private timer: ReturnType<typeof setInterval> | null = null;
  private proofTicks = 0;
  private inFlight = false;

  constructor() {
    // The route param changes without re-creating the component (chip clicks navigate).
    effect(() => {
      const id = this.proposalId();
      untracked(() => {
        if (id && id !== this.proposal()?.id) void this.select(id);
      });
    });
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  async ngOnInit(): Promise<void> {
    if (!getAccessToken()) {
      await this.router.navigateByUrl('/console');
      return;
    }
    await Promise.all([this.loadProposals(), this.refreshDlq(), this.probeChaos()]);
    if (!this.proposal()) {
      const first = this.proposalId() ?? this.proposals()[0]?.id ?? null;
      if (first) await this.select(first);
    }
    this.startTimer();
  }

  // ---- liveness --------------------------------------------------------------------------

  private startTimer(): void {
    this.stopTimer();
    const ms = this.pollMs() ?? DEFAULT_POLL_MS;
    if (ms > 0) {
      this.timer = setInterval(() => void this.tick(), ms);
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  togglePause(): void {
    this.paused.update((v) => !v);
  }

  /** One poll: proposal + audit + events, the DLQ (unless forbidden) and the chaos state (if exposed). Never overlaps. */
  async tick(): Promise<void> {
    if (this.paused() || this.inFlight) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.inFlight = true;
    this.ticking.set(true);
    try {
      await Promise.all([this.refreshProposal(), this.refreshDlq(), this.refreshChaos()]);
      this.lastTick.set(new Date());
    } finally {
      this.inFlight = false;
      this.ticking.set(false);
    }
  }

  // ---- proposal ----------------------------------------------------------------------------

  async loadProposals(): Promise<void> {
    try {
      this.proposals.set(await listAllProposals(20));
    } catch (e) {
      this.loadError.set(this.message(e));
      this.handleAuth(e);
    }
  }

  async select(id: string): Promise<void> {
    this.lastAnswer.set(null);
    this.loadError.set(null);
    const known = this.proposals().find((p) => p.id === id) ?? null;
    if (known) this.proposal.set(known);
    await this.refreshProposal(id, true);
  }

  onPick(p: ActionProposal): void {
    void this.router.navigate(['/live', p.id]);
    void this.select(p.id);
  }

  private async refreshProposal(id: string | null = this.proposal()?.id ?? null, force = false): Promise<void> {
    if (!id) return;
    try {
      const [full, events] = await Promise.all([getProposal(id), getProposalEvents(id).catch(() => null)]);
      const moved = force || proposalChanged(this.proposal(), full.proposal);
      this.proposal.set(full.proposal);
      this.audit.set(full.audit);
      if (events) this.events.set(events);
      this.proposals.update((list) =>
        list.some((x) => x.id === full.proposal.id) ? list.map((x) => (x.id === full.proposal.id ? full.proposal : x)) : [full.proposal, ...list],
      );
      if (moved) {
        const [receipts, lineage] = await Promise.all([
          listProposalReceipts(id).catch(() => []),
          getProposalLineage(id, 1).then(
            () => true,
            (e) => describeFailure(e).status !== 404,
          ),
        ]);
        this.receiptKinds.set(receipts.map((r) => r.body.kind));
        this.lineageAvailable.set(lineage);
        this.proof.set(await loadProof(receipts));
        this.panelsVersion.update((v) => v + 1);
      } else if (full.proposal.status === 'EXECUTED' && this.proof().inclusion !== true && ++this.proofTicks % PROOF_EVERY_TICKS === 0) {
        // Anchoring runs after execution, in its own batch: the row does not move when the root
        // finalizes, so PROVE is re-read on its own (every few ticks) until the proof checks out.
        const receipts = await listProposalReceipts(id).catch(() => [] as IntelligenceReceipt[]);
        const before = this.proof();
        const next = await loadProof(receipts);
        this.receiptKinds.set(receipts.map((r) => r.body.kind));
        this.proof.set(next);
        if (next.inclusion !== before.inclusion || next.batch?.status !== before.batch?.status) this.panelsVersion.update((v) => v + 1);
      }
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(this.message(e));
      this.handleAuth(e);
    }
  }

  // ---- actions (the same endpoints the dashboard uses; nothing new) ------------------------

  canApprove(): boolean {
    return this.proposal()?.status === 'AWAITING_APPROVAL';
  }

  canCancel(): boolean {
    return this.proposal()?.status === 'APPROVED';
  }

  /** Enabled on APPROVED even when the policy says not executable: the 409 is what the demo shows. */
  canExecute(): boolean {
    return this.proposal()?.status === 'APPROVED';
  }

  async onDecide(decision: 'approve' | 'reject'): Promise<void> {
    const p = this.proposal();
    if (!p) return;
    await this.act(decision, () => decideProposal(p.id, decision, `${decision === 'approve' ? 'Approved' : 'Rejected'} from the live view`));
  }

  async onCancel(): Promise<void> {
    const p = this.proposal();
    if (!p) return;
    await this.act('cancel', () => cancelProposal(p.id, 'Cancelled inside the timelock from the live view'));
  }

  /** Same operationId on every click for this proposal: the second click is the idempotency demo (200, same signature). */
  async onExecute(): Promise<void> {
    const p = this.proposal();
    if (!p) return;
    let op = this.operationIds.get(p.id);
    if (!op) {
      op = newOperationId();
      this.operationIds.set(p.id, op);
    }
    await this.act('execute', () => executeProposal(p.id, op));
  }

  private async act(action: string, call: () => Promise<ActionProposal>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const updated = await call();
      this.lastAnswer.set({
        at: new Date().toISOString(),
        action,
        ok: true,
        status: 200,
        code: null,
        message: `${updated.status}${updated.execution?.signature ? ` · ${shortSig(updated.execution.signature)}` : ''}`,
      });
    } catch (e) {
      const f: ApiFailure = describeFailure(e);
      this.lastAnswer.set({ at: new Date().toISOString(), action, ok: false, status: f.status, code: f.code, message: f.message });
      this.handleAuth(e);
    } finally {
      this.busy.set(false);
      await this.refreshProposal();
    }
  }

  // ---- DLQ ---------------------------------------------------------------------------------

  private async refreshDlq(): Promise<void> {
    if (this.dlqForbidden()) return;
    try {
      this.dlq.set(await listDeadLetters('all', 20));
      this.dlqError.set(null);
    } catch (e) {
      const f = describeFailure(e);
      if (f.status === 403) {
        this.dlqForbidden.set(true);
      } else {
        this.dlqError.set(f.message);
      }
      this.handleAuth(e);
    }
  }

  askDlq(dl: DeadLetter, action: 'resolve' | 'requeue'): void {
    this.dlqConfirm.set({ id: dl.id, action });
    this.dlqNote.set('');
  }

  cancelDlq(): void {
    this.dlqConfirm.set(null);
  }

  async confirmDlq(): Promise<void> {
    const c = this.dlqConfirm();
    if (!c || this.dlqBusy()) return;
    this.dlqBusy.set(c.id);
    try {
      const note = this.dlqNote().trim() || null;
      const resolution = c.action === 'requeue' ? await requeueDeadLetter(c.id, note) : await resolveDeadLetter(c.id, note);
      this.dlqLast.set({ action: c.action, resolution });
      this.dlqConfirm.set(null);
      this.dlqError.set(null);
      if (resolution.proposal && resolution.proposal.id !== this.proposal()?.id) {
        this.onPick(resolution.proposal);
      }
    } catch (e) {
      const f = describeFailure(e);
      this.dlqError.set(`${f.status ? f.status + ' · ' : ''}${f.message}`);
      this.handleAuth(e);
    } finally {
      this.dlqBusy.set(null);
      await Promise.all([this.refreshDlq(), this.refreshProposal()]);
    }
  }

  // ---- chaos (only when the backend exposes /demo/chaos) -----------------------------------

  private async probeChaos(): Promise<void> {
    try {
      const view = await getChaos();
      this.chaosAvailable.set(view !== null);
      this.chaos.set(view);
    } catch (e) {
      this.handleAuth(e);
    }
  }

  private async refreshChaos(): Promise<void> {
    if (!this.chaosAvailable()) return;
    try {
      const view = await getChaos();
      if (view) this.chaos.set(view);
    } catch (e) {
      this.handleAuth(e);
    }
  }

  async onArmChaos(): Promise<void> {
    await this.chaosCall(() => armChaos(this.chaosMode(), this.chaosShots()));
  }

  async onDisarmChaos(): Promise<void> {
    await this.chaosCall(() => disarmChaos());
  }

  private async chaosCall(call: () => Promise<ChaosView>): Promise<void> {
    if (this.chaosBusy()) return;
    this.chaosBusy.set(true);
    this.chaosError.set(null);
    try {
      this.chaos.set(await call());
    } catch (e) {
      this.chaosError.set(describeFailure(e).message);
      this.handleAuth(e);
    } finally {
      this.chaosBusy.set(false);
    }
  }

  // ---- helpers -----------------------------------------------------------------------------

  statusClass(status: string | null | undefined): string {
    switch (status) {
      case 'EXECUTED':
      case 'APPROVED':
        return 'ok';
      case 'AWAITING_APPROVAL':
      case 'EXECUTING':
      case 'SUBMITTED':
        return 'warn';
      case 'BLOCKED_BY_POLICY':
      case 'REJECTED':
      case 'FAILED':
      case 'EXPIRED':
        return 'err';
      default:
        return '';
    }
  }

  outboxClass(status: string): string {
    return status === 'PUBLISHED' ? 'ok' : status === 'FAILED' ? 'err' : 'warn';
  }

  fmtTime(d: Date | string | null): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().slice(11, 19) + ' UTC';
  }

  private message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  private handleAuth(e: unknown): void {
    if (e instanceof AuthRequiredError) {
      this.stopTimer();
      void this.router.navigateByUrl('/console');
    }
  }
}
