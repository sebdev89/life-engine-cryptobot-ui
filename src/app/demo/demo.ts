import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExecutionDetail } from '../live/execution-detail/execution-detail';
import { buildStages, buildTimeline, formatDuration } from '../live/live-model';
import { explorerTxUrl } from '../receipts-api';
import { uiConfig } from '../config';
import { WalletView } from '../control-plane-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { DemoRunner, RunStep, runExplorerUrl } from './demo-runner';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { explorerTxUrlFor } from '../live/live-model';
import { proofLinkOf } from '../proof/proof-model';

/** Scenario B's story, one node per step of the runner (states come from the run, not from a script). */
export const FAILURE_STORY: readonly { step: string; label: string }[] = [
  { step: 'failed', label: 'FAILED' },
  { step: 'deadletter', label: 'DEAD LETTER' },
  { step: 'retry', label: 'RETRY' },
  { step: 'idempotency', label: 'IDEMPOTENCY CHECK' },
  { step: 'recovered', label: 'RECOVERED' },
  { step: 'finalize', label: 'FINALIZED' },
  { step: 'verified', label: 'PROOF' },
];

/**
 * `/demo` (KAN-785): one click runs the trusted execution end to end against the stack, and the
 * 8-stage pipeline of `/live` (same component, same model) animates from the API answers.
 */
@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [RouterLink, ExecutionDetail, TopNav, TokenGate],
  templateUrl: './demo.html',
  styleUrl: './demo.scss',
})
export class DemoMode {
  readonly runner = new DemoRunner();
  readonly run = this.runner.state;
  readonly now = signal(Date.now());
  readonly signedIn = signal(false);
  /** The wallet the run will use (null until known); `needsAddress` when the operator has none yet. */
  readonly wallet = signal<WalletView | null>(null);
  readonly needsAddress = signal(false);
  readonly address = signal(uiConfig().demoWallet ?? '');

  readonly stages = computed(() => {
    const s = this.run();
    return buildStages(s.proposal, buildTimeline(s.proposal, s.audit, s.receiptKinds), s.proof, [], s.phase === 'running' ? this.now() : null);
  });
  readonly elapsed = computed(() => {
    const s = this.run();
    if (s.startedAt === null) return '—';
    return formatDuration((s.finishedAt ?? this.now()) - s.startedAt);
  });
  readonly countdown = computed(() => {
    const w = this.run().waiting;
    if (!w || w.until === null) return null;
    return Math.max(0, Math.ceil((w.until - this.now()) / 1000));
  });
  readonly explorer = computed(() => runExplorerUrl(this.run()));
  readonly proofLink = computed(() => proofLinkOf(this.run().proof));
  readonly anchorExplorer = computed(() => {
    const v = this.run().receiptVerification?.anchor;
    return v ? (v.explorerUrl ?? explorerTxUrl(v.chain, v.tx)) : null;
  });

  readonly story = computed(() => {
    const steps = this.run().steps;
    return FAILURE_STORY.map((n) => ({ ...n, state: steps.find((s) => s.id === n.step)?.state ?? 'pending' }));
  });
  readonly previousSignature = computed(() => this.run().proposal?.execution?.previousSignature ?? this.run().firstSignature);
  readonly previousExplorer = computed(() => {
    const p = this.run().proposal;
    const prev = this.previousSignature();
    return p && prev ? explorerTxUrlFor(p.cluster, prev) : null;
  });
  readonly sameOperation = computed(() => {
    const s = this.run();
    return !!s.operationId && s.proposal?.operationId === s.operationId;
  });

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) this.loadWallet();
    const timer = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.runner.cancel();
    });
  }

  /** KAN-789: without a session /demo asks for the token instead of failing; once given, the run is possible. */
  onSignedIn(): void {
    this.signedIn.set(true);
    this.loadWallet();
  }

  private loadWallet(): void {
    this.runner
      .findWallet()
      .then((w) => {
        this.wallet.set(w);
        this.needsAddress.set(!w);
      })
      .catch(() => this.needsAddress.set(false));
  }

  start(scenario: 'success' | 'failure' = 'success'): void {
    if (this.needsAddress()) this.runner.setDemoWallet(this.address());
    const run = scenario === 'failure' ? this.runner.runSimulateFailure() : this.runner.runTrustedExecution();
    void run.then((s) => {
      if (s.wallet) {
        this.wallet.set(s.wallet);
        this.needsAddress.set(false);
      }
    });
  }

  canStart(): boolean {
    return !this.runner.running() && this.signedIn() && !(this.needsAddress() && !this.address());
  }

  phaseLabel(): string {
    const s = this.run();
    if (s.phase === 'verified') return s.scenario === 'failure' ? 'RECOVERED' : 'VERIFIED';
    return s.phase;
  }

  phaseClass(): string {
    return { verified: 'done', running: 'active', failed: 'failed', cancelled: 'skipped', idle: 'pending' }[this.run().phase];
  }

  onAddress(e: Event): void {
    this.address.set((e.target as HTMLInputElement).value);
  }

  cancel(): void {
    this.runner.cancel();
  }

  glyph(s: RunStep): string {
    return (
      {
        done: '✓',
        failed: '✗',
        active: '●',
        uncertain: '?',
        skipped: '–',
        pending: '○',
      }[s.state] ?? '○'
    );
  }

  took(s: RunStep): string {
    if (s.startedAt === null) return '';
    return formatDuration((s.endedAt ?? this.now()) - s.startedAt);
  }
}
