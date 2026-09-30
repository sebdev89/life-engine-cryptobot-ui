import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ExecutionDetail } from "../live/execution-detail/execution-detail";
import { buildStages, buildTimeline, formatDuration } from "../live/live-model";
import { explorerTxUrl } from "../receipts-api";
import { uiConfig } from "../config";
import { WalletView } from "../control-plane-api";
import { bootstrapSessionFromQuery, getAccessToken } from "../session";
import { DemoRunner, RunStep, runExplorerUrl } from "./demo-runner";

/**
 * `/demo` (KAN-785): one click runs the trusted execution end to end against the stack, and the
 * 8-stage pipeline of `/live` (same component, same model) animates from the API answers.
 */
@Component({
  selector: "app-demo",
  standalone: true,
  imports: [RouterLink, ExecutionDetail],
  templateUrl: "./demo.html",
  styleUrl: "./demo.scss",
})
export class DemoMode {
  readonly runner = new DemoRunner();
  readonly run = this.runner.state;
  readonly now = signal(Date.now());
  readonly signedIn = signal(false);
  /** The wallet the run will use (null until known); `needsAddress` when the operator has none yet. */
  readonly wallet = signal<WalletView | null>(null);
  readonly needsAddress = signal(false);
  readonly address = signal(uiConfig().demoWallet ?? "");

  readonly stages = computed(() => {
    const s = this.run();
    return buildStages(
      s.proposal,
      buildTimeline(s.proposal, s.audit, s.receiptKinds),
      s.proof,
      [],
      s.phase === "running" ? this.now() : null,
    );
  });
  readonly elapsed = computed(() => {
    const s = this.run();
    if (s.startedAt === null) return "—";
    return formatDuration((s.finishedAt ?? this.now()) - s.startedAt);
  });
  readonly countdown = computed(() => {
    const w = this.run().waiting;
    if (!w || w.until === null) return null;
    return Math.max(0, Math.ceil((w.until - this.now()) / 1000));
  });
  readonly explorer = computed(() => runExplorerUrl(this.run()));
  readonly anchorExplorer = computed(() => {
    const v = this.run().receiptVerification?.anchor;
    return v ? (v.explorerUrl ?? explorerTxUrl(v.chain, v.tx)) : null;
  });

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) {
      this.runner
        .findWallet()
        .then((w) => {
          this.wallet.set(w);
          this.needsAddress.set(!w);
        })
        .catch(() => this.needsAddress.set(false));
    }
    const timer = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.runner.cancel();
    });
  }

  start(): void {
    if (this.needsAddress()) this.runner.setDemoWallet(this.address());
    void this.runner.runTrustedExecution().then((s) => {
      if (s.wallet) {
        this.wallet.set(s.wallet);
        this.needsAddress.set(false);
      }
    });
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
        done: "✓",
        failed: "✗",
        active: "●",
        uncertain: "?",
        skipped: "–",
        pending: "○",
      }[s.state] ?? "○"
    );
  }

  took(s: RunStep): string {
    if (s.startedAt === null) return "";
    return formatDuration((s.endedAt ?? this.now()) - s.startedAt);
  }
}
