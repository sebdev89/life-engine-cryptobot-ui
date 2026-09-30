import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActionProposal, AuditEvent, getProposal, listAllProposals } from '../control-plane-api';
import { AuthRequiredError } from '../cryptobot-api';
import { NO_PROOF, ProofInput, Stage, buildStages, buildTimeline, explorerTxUrlFor, formatDuration, shortSig } from '../live/live-model';
import { loadProof } from '../live/proof-loader';
import { AnchorView, listAnchors, listProposalReceipts } from '../receipts-api';
import { DeadLetterPage, listDeadLetters } from '../reliability-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import {
  ANCHORS_API_MAX,
  DEAD_LETTERS_API_MAX,
  PROPOSALS_API_MAX,
  Phase,
  approvalLine,
  computeKpis,
  currentPhase,
  intentLine,
  latestRows,
  lettersOf,
  policyLine,
  usd,
} from './tower-model';

export const TOWER_POLL_MS = 5000;
/** Rows of the "latest executions" table; each one costs a detail read when it changes. */
export const TOWER_ROWS = 10;

/** What one row needs beyond the list: its audit trail (→ 8 stages) and its proof. */
interface RowDetail {
  updatedAt: string;
  audit: AuditEvent[];
  receiptKinds: string[];
  proof: ProofInput;
}

type Source<T> = { ok: true; value: T } | { ok: false; reason: string };

function reasonOf(e: unknown): string {
  const status = (e as { apiError?: { status?: number } } | null)?.apiError?.status;
  if (status === 403) return 'needs RUNTIME_ADMIN';
  if (status) return `HTTP ${status}`;
  return 'not reachable';
}

/**
 * `/tower` (KAN-787): Agent Execution Control Tower. KPIs are counted in this browser from the
 * API every 5 s; the table shows the latest executions with the stage each one is in.
 */
@Component({
  selector: 'app-tower',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate],
  templateUrl: './tower.html',
  styleUrl: './tower.scss',
})
export class ControlTower {
  readonly signedIn = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastRefresh = signal<number | null>(null);
  readonly showAll = signal(false);

  readonly proposals = signal<ActionProposal[]>([]);
  readonly deadLetters = signal<Source<DeadLetterPage> | null>(null);
  readonly anchors = signal<Source<AnchorView[]> | null>(null);
  readonly details = signal<ReadonlyMap<string, RowDetail>>(new Map());

  readonly limits = { proposals: PROPOSALS_API_MAX, anchors: ANCHORS_API_MAX, deadLetters: DEAD_LETTERS_API_MAX };

  readonly kpis = computed(() => {
    const dl = this.deadLetters();
    const an = this.anchors();
    return computeKpis({
      proposals: this.proposals(),
      deadLetters: dl?.ok ? dl.value : null,
      anchors: an?.ok ? an.value : null,
    });
  });
  readonly dlReason = computed(() => {
    const d = this.deadLetters();
    return d && !d.ok ? d.reason : null;
  });
  readonly anchorReason = computed(() => {
    const a = this.anchors();
    return a && !a.ok ? a.reason : null;
  });
  readonly latency = computed(() => formatDuration(this.kpis().latencyMeanMs));

  readonly rows = computed(() => {
    const dl = this.deadLetters();
    const letters = dl?.ok ? dl.value.deadLetters : null;
    const details = this.details();
    return latestRows(this.proposals(), TOWER_ROWS, this.showAll()).map((p) => {
      const d = details.get(p.id);
      const stages: Stage[] = d ? buildStages(p, buildTimeline(p, d.audit, d.receiptKinds), d.proof, lettersOf(letters, p.id)) : [];
      const phase: Phase | null = currentPhase(stages);
      const reconcile = stages.find((s) => s.id === 'RECONCILE') ?? null;
      const prove = stages.find((s) => s.id === 'PROVE') ?? null;
      return {
        p,
        policy: policyLine(p),
        approval: approvalLine(p),
        intent: intentLine(p),
        amount: usd(p.plan?.turnoverUsd),
        risk: p.riskBefore ? (p.riskAfter && p.riskAfter.overall !== p.riskBefore.overall ? `${p.riskBefore.overall} → ${p.riskAfter.overall}` : p.riskBefore.overall) : '—',
        sig: p.execution?.signature ? shortSig(p.execution.signature) : null,
        explorer: explorerTxUrlFor(p.cluster, p.execution?.signature, p.execution?.explorerUrl),
        retries: p.execution?.retries ?? 0,
        letters: lettersOf(letters, p.id).length,
        phase,
        reconcile,
        prove,
        proofRoot: d?.proof.batch?.root ?? d?.proof.receipt?.anchor?.root ?? null,
        loading: !d,
      };
    });
  });

  private busy = false;
  private tick = 0;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.refresh();
    const timer = setInterval(() => {
      if (this.signedIn()) void this.refresh();
    }, TOWER_POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    this.error.set(null);
    void this.refresh();
  }

  toggleAll(): void {
    this.showAll.update((v) => !v);
    void this.loadDetails();
  }

  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.tick++;
    try {
      const [proposals, dl, an] = await Promise.all([
        listAllProposals(PROPOSALS_API_MAX),
        listDeadLetters('all', DEAD_LETTERS_API_MAX).then(
          (value): Source<DeadLetterPage> => ({ ok: true, value }),
          (e): Source<DeadLetterPage> => {
            if (e instanceof AuthRequiredError) throw e;
            return { ok: false, reason: reasonOf(e) };
          },
        ),
        listAnchors(ANCHORS_API_MAX).then(
          (value): Source<AnchorView[]> => ({ ok: true, value }),
          (e): Source<AnchorView[]> => {
            if (e instanceof AuthRequiredError) throw e;
            return { ok: false, reason: reasonOf(e) };
          },
        ),
      ]);
      this.proposals.set(proposals);
      this.deadLetters.set(dl);
      this.anchors.set(an);
      this.error.set(null);
      this.loaded.set(true);
      this.lastRefresh.set(Date.now());
      await this.loadDetails();
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`API not reachable: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * Reads the audit + proof of the visible rows: again when the proposal changed, and — while its
   * PROVE stage is not closed (anchoring runs in batches) — every third poll.
   */
  private async loadDetails(): Promise<void> {
    const rows = latestRows(this.proposals(), TOWER_ROWS, this.showAll());
    const current = this.details();
    const stale = rows.filter((p) => {
      const d = current.get(p.id);
      if (!d || d.updatedAt !== p.updatedAt) return true;
      const proveOpen = p.status === 'EXECUTED' && d.proof.inclusion !== true;
      return proveOpen && this.tick % 3 === 0;
    });
    if (!stale.length) return;
    const fresh = await Promise.all(
      stale.map(async (p): Promise<[string, RowDetail] | null> => {
        try {
          const [{ audit }, receipts] = await Promise.all([getProposal(p.id), listProposalReceipts(p.id).catch(() => [])]);
          const proof = p.status === 'EXECUTED' ? await loadProof(receipts).catch(() => NO_PROOF) : NO_PROOF;
          return [p.id, { updatedAt: p.updatedAt, audit, receiptKinds: receipts.map((r) => r.body.kind), proof }];
        } catch (e) {
          if (e instanceof AuthRequiredError) throw e;
          return null;
        }
      }),
    );
    const next = new Map(this.details());
    for (const f of fresh) if (f) next.set(f[0], f[1]);
    this.details.set(next);
  }

  phaseClass(ph: Phase | null): string {
    return ph ? ph.state : 'pending';
  }

  phaseLabel(ph: Phase | null, status: string): string {
    if (!ph) return '…';
    if (ph.id === 'PROVE' && ph.state === 'done') return 'VERIFIED';
    if (ph.state === 'failed' && status === 'BLOCKED_BY_POLICY') return 'BLOCKED';
    return ph.id;
  }

  statusClass(status: string): string {
    if (status === 'EXECUTED') return 'done';
    if (status === 'FAILED' || status === 'BLOCKED_BY_POLICY' || status === 'REJECTED' || status === 'EXPIRED') return 'failed';
    if (status === 'EXECUTING' || status === 'SUBMITTED' || status === 'APPROVED' || status === 'AWAITING_APPROVAL') return 'active';
    return 'pending';
  }

  shortRoot(root: string | null): string {
    if (!root) return '—';
    const hex = root.startsWith('sha256:') ? root.slice(7) : root;
    return `${hex.slice(0, 8)}…${hex.slice(-4)}`;
  }

  ago(): string {
    const t = this.lastRefresh();
    return t === null ? '—' : new Date(t).toLocaleTimeString();
  }
}
