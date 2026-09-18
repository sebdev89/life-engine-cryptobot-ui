import { Component, effect, input, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import {
  IntelligenceReceipt,
  ReceiptVerification,
  anchorLabel,
  explorerTxUrl,
  listProposalReceipts,
  listWalletReceipts,
  shortHash,
  shortSig,
  sortReceipts,
  verifyReceipt,
} from '../receipts-api';

/**
 * The receipts a proposal (or, with no proposal selected, a wallet) left behind, with their
 * devnet anchor (KAN-394): a receipt that is in a FINALIZED batch links to the memo transaction
 * on the Solana explorer; "Verify" recomputes hash + signature + parents on the server and folds
 * the Merkle proof back to the root in that transaction.
 */
@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './receipts.html',
  styleUrl: './receipts.scss',
})
export class Receipts {
  readonly walletId = input<string | null>(null);
  readonly proposalId = input<string | null>(null);
  /** Bump to reload (after approve / execute / refresh). */
  readonly version = input(0);

  readonly receipts = signal<IntelligenceReceipt[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly verifying = signal<string | null>(null);
  readonly verifications = signal<Record<string, ReceiptVerification>>({});

  readonly shortHash = shortHash;
  readonly shortSig = shortSig;
  readonly anchorLabel = anchorLabel;
  readonly explorerTxUrl = explorerTxUrl;

  constructor() {
    effect(() => {
      const proposal = this.proposalId();
      const wallet = this.walletId();
      this.version();
      void this.load(proposal, wallet);
    });
  }

  async load(proposalId: string | null, walletId: string | null): Promise<void> {
    if (!proposalId && !walletId) {
      this.receipts.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = proposalId ? await listProposalReceipts(proposalId) : await listWalletReceipts(walletId!);
      this.receipts.set(sortReceipts(list));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }

  async verify(r: IntelligenceReceipt): Promise<void> {
    this.verifying.set(r.receiptHash);
    try {
      const v = await verifyReceipt(r.receiptHash);
      this.verifications.update((m) => ({ ...m, [r.receiptHash]: v }));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.verifying.set(null);
    }
  }

  anchoredCount(): number {
    return this.receipts().filter((r) => r.anchor?.tx).length;
  }
}
