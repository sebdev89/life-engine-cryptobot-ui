import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { ReceiptView, getReceipt } from '../lineage-api';
import { ProofPath, proofPath, webCryptoSha256 } from '../merkle';
import { AnchorDetail, AnchorVerification, AnchorView, explorerTxUrl, getAnchor, listAnchors, verifyAnchor } from '../receipts-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { Check, anchorState, pickMember, shortHex, verificationChecks } from './proof-model';

const LIST_LIMIT = 50;

/**
 * `/proof` and `/proof/:root`. The list is `GET /anchors`; the detail is
 * `GET /anchors/{root}` (the batch + the caller's members with their Merkle siblings), the
 * inclusion path of one member folded in this browser (`merkle.proofPath`), and
 * `POST /anchors/{root}/verify` on demand — the server's check, shown next to ours.
 */
@Component({
  selector: 'app-proof',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate],
  templateUrl: './proof.html',
  styleUrl: './proof.scss',
})
export class ProofView {
  /** Route param (`/proof/:root`); absent on the list. */
  readonly root = input<string | undefined>();
  /** `?receipt=` — the member to open first (links from /live, /demo, /tower). */
  readonly receipt = input<string | undefined>();

  private readonly router = inject(Router);

  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly anchors = signal<AnchorView[] | null>(null);
  readonly detail = signal<AnchorDetail | null>(null);
  readonly selected = signal<string | null>(null);
  readonly path = signal<ProofPath | null>(null);
  /** true/false folded here; null when this browser cannot hash (no WebCrypto). */
  readonly pathOk = signal<boolean | null>(null);
  readonly receiptView = signal<ReceiptView | null>(null);
  readonly verification = signal<AnchorVerification | null>(null);
  readonly verifying = signal(false);
  readonly verifyError = signal<string | null>(null);

  readonly checks = computed<Check[]>(() => {
    const v = this.verification();
    return v ? verificationChecks(v) : [];
  });
  readonly batchState = computed(() => anchorState(this.detail()?.anchor.status));
  readonly explorer = computed(() => {
    const d = this.detail();
    return d ? (d.explorerUrl ?? explorerTxUrl(d.anchor.chain, d.anchor.tx)) : null;
  });
  readonly member = computed(() => this.detail()?.myReceipts.find((m) => m.receiptHash === this.selected()) ?? null);

  readonly shortHex = shortHex;
  readonly anchorState = anchorState;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    effect(() => {
      const root = this.root();
      const signed = this.signedIn();
      untracked(() => {
        if (!signed) return;
        if (root) void this.loadDetail(root);
        else void this.loadList();
      });
    });
    // The list and a batch still anchoring refresh on their own; a FINALIZED batch never changes.
    const timer = setInterval(() => {
      if (!this.signedIn()) return;
      const root = this.root();
      if (!root) void this.loadList();
      else if (this.batchState() === 'active') void this.loadDetail(root, false);
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  onSignedIn(): void {
    this.signedIn.set(true);
  }

  private fail(e: unknown): void {
    if (e instanceof AuthRequiredError) {
      this.signedIn.set(false);
      this.error.set('The token was rejected or expired.');
      return;
    }
    const status = (e as { apiError?: { status?: number } })?.apiError?.status;
    this.error.set(status === 404 ? 'No anchor batch with this root.' : `API: ${(e as Error)?.message ?? e}`);
  }

  async loadList(): Promise<void> {
    try {
      this.anchors.set(await listAnchors(LIST_LIMIT));
      this.error.set(null);
    } catch (e) {
      this.fail(e);
    }
  }

  async loadDetail(root: string, reset = true): Promise<void> {
    if (reset) {
      this.detail.set(null);
      this.verification.set(null);
      this.verifyError.set(null);
    }
    try {
      const d = await getAnchor(root);
      this.detail.set(d);
      this.error.set(null);
      const pick = pickMember(d, this.selected() ?? this.receipt());
      if (reset || pick !== this.selected()) await this.select(pick);
    } catch (e) {
      this.fail(e);
    }
  }

  async select(hash: string | null): Promise<void> {
    this.selected.set(hash);
    this.path.set(null);
    this.pathOk.set(null);
    this.receiptView.set(null);
    const m = this.member();
    if (!hash || !m) return;
    const sha = webCryptoSha256();
    if (sha) {
      try {
        const p = await proofPath(hash, m.proof, sha);
        this.path.set(p);
        this.pathOk.set(p.root === this.detail()?.anchor.root);
      } catch {
        this.pathOk.set(false);
      }
    }
    getReceipt(hash)
      .then((r) => this.receiptView.set(r))
      .catch(() => this.receiptView.set(null));
  }

  choose(hash: string): void {
    void this.select(hash);
    void this.router.navigate([], { queryParams: { receipt: hash }, replaceUrl: true });
  }

  async verify(): Promise<void> {
    const d = this.detail();
    if (!d) return;
    this.verifying.set(true);
    this.verifyError.set(null);
    try {
      this.verification.set(await verifyAnchor(d.anchor.root));
    } catch (e) {
      if (e instanceof AuthRequiredError) this.fail(e);
      else this.verifyError.set((e as Error)?.message ?? String(e));
    } finally {
      this.verifying.set(false);
    }
  }

  anchorExplorer(a: AnchorView): string | null {
    return a.explorerUrl ?? explorerTxUrl(a.anchor.chain, a.anchor.tx);
  }

  checkClass(c: Check): string {
    return c.ok === true ? 'done' : c.ok === false ? 'failed' : 'skipped';
  }
}
