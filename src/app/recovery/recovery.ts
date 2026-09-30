import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActionProposal, DeadLetter, listAllProposals } from '../control-plane-api';
import { AuthRequiredError } from '../cryptobot-api';
import { formatDuration } from '../live/live-model';
import { CHAOS_MODES, ChaosMode, ChaosView, DeadLetterPage, armChaos, disarmChaos, getChaos, listDeadLetters, requeueDeadLetter, resolveDeadLetter } from '../reliability-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { DEAD_LETTERS_API_MAX, PROPOSALS_API_MAX } from '../tower/tower-model';
import { actionError, attemptsOf, countLetters, letterKind, letterState, recoveryHistory, shortId, sortLetters } from './recovery-model';

export const RECOVERY_POLL_MS = 5000;

/**
 * `/recovery`: the dead-letter queue — what the system refused to guess about — with the
 * human decision on each letter (requeue / resolve, RUNTIME_ADMIN), the recoveries it produced and,
 * in the demo stack only, the fault injection that makes one happen.
 */
@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate],
  templateUrl: './recovery.html',
  styleUrl: './recovery.scss',
})
export class RecoveryView {
  readonly signedIn = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  /** Set when the dead-letter read itself is refused (403 = not an admin). */
  readonly dlDenied = signal<string | null>(null);
  readonly lastRefresh = signal<number | null>(null);

  readonly page = signal<DeadLetterPage | null>(null);
  readonly proposals = signal<ActionProposal[]>([]);
  readonly chaos = signal<ChaosView | null>(null);
  readonly chaosLoaded = signal(false);

  readonly note = signal('');
  readonly acting = signal<string | null>(null);
  readonly actionMsg = signal<{ ok: boolean; text: string } | null>(null);

  readonly modes = CHAOS_MODES;
  readonly chaosMode = signal<ChaosMode>('rpc-down');
  readonly chaosShots = signal(-1);
  readonly chaosBusy = signal(false);
  readonly chaosMsg = signal<string | null>(null);

  readonly limit = DEAD_LETTERS_API_MAX;

  private readonly byId = computed(() => new Map(this.proposals().map((p) => [p.id, p])));
  readonly counts = computed(() => {
    const pg = this.page();
    return pg ? countLetters(pg.deadLetters, pg.open, this.proposals()) : null;
  });
  readonly meanDecision = computed(() => formatDuration(this.counts()?.meanDecisionMs));
  readonly rows = computed(() => {
    const pg = this.page();
    if (!pg) return [];
    const byId = this.byId();
    return sortLetters(pg.deadLetters).map((dl) => {
      const p = dl.proposalId ? byId.get(dl.proposalId) : undefined;
      return { dl, p, state: letterState(dl), kind: letterKind(dl), attempts: attemptsOf(p) };
    });
  });
  readonly history = computed(() => {
    const pg = this.page();
    return pg ? recoveryHistory(pg.deadLetters, this.proposals()) : [];
  });
  readonly faults = computed(() => (this.chaos()?.faults ?? []).slice(-5).reverse());

  private busy = false;
  /** Bumped by every arm/disarm: a poll that started before one must not paint the old chaos state back. */
  private chaosSeq = 0;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.refresh();
    const timer = setInterval(() => {
      if (this.signedIn() && !this.acting()) void this.refresh();
    }, RECOVERY_POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    this.error.set(null);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const seq = this.chaosSeq;
    try {
      const [page, proposals, chaos] = await Promise.all([
        listDeadLetters('all', DEAD_LETTERS_API_MAX).then(
          (v) => ({ ok: true as const, v }),
          (e) => {
            if (e instanceof AuthRequiredError) throw e;
            return { ok: false as const, e };
          },
        ),
        listAllProposals(PROPOSALS_API_MAX),
        getChaos(),
      ]);
      if (page.ok) {
        this.page.set(page.v);
        this.dlDenied.set(null);
      } else {
        const status = (page.e as { apiError?: { status?: number } })?.apiError?.status;
        if (status === 403) this.dlDenied.set('The dead-letter queue is global and needs the RUNTIME_ADMIN role (403).');
        else throw page.e;
      }
      this.proposals.set(proposals);
      if (seq === this.chaosSeq) this.chaos.set(chaos);
      this.chaosLoaded.set(true);
      this.error.set(null);
      this.loaded.set(true);
      this.lastRefresh.set(Date.now());
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

  async decide(dl: DeadLetter, action: 'requeue' | 'resolve'): Promise<void> {
    if (this.acting()) return;
    this.acting.set(dl.id);
    this.actionMsg.set(null);
    const note = this.note().trim() || null;
    try {
      const r = action === 'requeue' ? await requeueDeadLetter(dl.id, note) : await resolveDeadLetter(dl.id, note);
      const after = r.proposal ? ` · proposal ${shortId(r.proposal.id)} is ${r.proposal.status}` : '';
      const rec = r.reconciliation ? ` · reconciliation ${r.reconciliation}` : '';
      this.actionMsg.set({ ok: true, text: `Letter ${shortId(dl.id)} ${action === 'requeue' ? 'requeued' : 'resolved'}${after}${rec}.` });
      this.note.set('');
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
        return;
      }
      this.actionMsg.set({ ok: false, text: actionError(e) });
    } finally {
      this.acting.set(null);
    }
    await this.refresh();
  }

  async arm(): Promise<void> {
    await this.chaosCall(() => armChaos(this.chaosMode(), this.chaosShots()));
  }

  async disarm(): Promise<void> {
    await this.chaosCall(() => disarmChaos());
  }

  private async chaosCall(fn: () => Promise<ChaosView>): Promise<void> {
    this.chaosBusy.set(true);
    this.chaosMsg.set(null);
    this.chaosSeq++;
    try {
      this.chaos.set(await fn());
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        return;
      }
      this.chaosMsg.set(actionError(e));
    } finally {
      this.chaosBusy.set(false);
    }
  }

  onNote(e: Event): void {
    this.note.set((e.target as HTMLInputElement).value);
  }

  onMode(e: Event): void {
    this.chaosMode.set((e.target as HTMLSelectElement).value as ChaosMode);
  }

  onShots(e: Event): void {
    const n = Number.parseInt((e.target as HTMLInputElement).value, 10);
    this.chaosShots.set(Number.isFinite(n) && n !== 0 ? Math.max(-1, n) : -1);
  }

  modeWhat(): string {
    return this.modes.find((m) => m.id === this.chaosMode())?.what ?? '';
  }

  dur(ms: number | null): string {
    return formatDuration(ms);
  }

  short(id: string | null | undefined): string {
    return shortId(id);
  }

  stateClass(state: string): string {
    return state === 'OPEN' ? 'uncertain' : state === 'REQUEUED' ? 'active' : 'done';
  }

  statusClass(status: string | undefined): string {
    if (status === 'EXECUTED') return 'done';
    if (status === 'FAILED' || status === 'BLOCKED_BY_POLICY' || status === 'REJECTED' || status === 'EXPIRED') return 'failed';
    if (status) return 'active';
    return 'pending';
  }

  ago(): string {
    const t = this.lastRefresh();
    return t === null ? '—' : new Date(t).toLocaleTimeString();
  }
}
