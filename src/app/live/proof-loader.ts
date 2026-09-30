/**
 * PROVE from existing endpoints only (shared with Demo Mode): the EXECUTION
 * receipt (`/proposals/{id}/receipts`), the batch that anchors it (`GET /anchors/{root}`; while the
 * receipt carries no anchor yet, the open batches of `GET /anchors?limit=` are checked for it), and
 * the Merkle proof folded in the browser.
 */
import { inclusionProofValid } from '../merkle';
import { AnchorDetail, IntelligenceReceipt, explorerTxUrl, getAnchor, listAnchors } from '../receipts-api';
import { NO_PROOF, ProofInput } from './live-model';

export async function loadProof(receipts: readonly IntelligenceReceipt[]): Promise<ProofInput> {
  const receipt = receipts.find((r) => r.body.kind === 'EXECUTION') ?? null;
  if (!receipt) return NO_PROOF;
  let detail: AnchorDetail | null = null;
  if (receipt.anchor?.root) {
    detail = await getAnchor(receipt.anchor.root).catch(() => null);
  } else {
    const open = (await listAnchors(5).catch(() => [])).filter((a) => a.anchor.status !== 'FINALIZED' && a.anchor.createdAt >= receipt.createdAt);
    for (const a of open.slice(0, 3)) {
      const d = await getAnchor(a.anchor.root).catch(() => null);
      if (d?.myReceipts?.some((m) => m.receiptHash === receipt.receiptHash)) {
        detail = d;
        break;
      }
    }
  }
  const member = detail?.myReceipts?.find((m) => m.receiptHash === receipt.receiptHash);
  const proof = member?.proof ?? receipt.anchor?.proof ?? null;
  const root = detail?.anchor.root ?? receipt.anchor?.root ?? null;
  const finalized = detail ? detail.anchor.status === 'FINALIZED' : !!receipt.anchor?.tx;
  return {
    receipt,
    batch: detail?.anchor ?? null,
    batchExplorerUrl: detail?.explorerUrl ?? explorerTxUrl(receipt.anchor?.chain, receipt.anchor?.tx),
    proof,
    inclusion: finalized ? await inclusionProofValid(receipt.receiptHash, proof, root) : null,
  };
}
