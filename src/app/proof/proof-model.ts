/**
 * Pure helpers of the Proof view. The server's answer (`POST /anchors/{root}/verify`)
 * is shown check by check, next to what this browser recomputed on its own (`merkle.proofPath`).
 */
import { ProofInput, StepState } from '../live/live-model';
import { AnchorBatch, AnchorDetail, AnchorVerification } from '../receipts-api';

export function anchorState(status: AnchorBatch['status'] | null | undefined): StepState {
  switch (status) {
    case 'FINALIZED':
      return 'done';
    case 'FAILED':
    case 'ABANDONED':
      return 'failed';
    case 'PENDING':
    case 'SUBMITTED':
      return 'active';
    default:
      return 'pending';
  }
}

export interface Check {
  id: string;
  label: string;
  /** true pass · false fail · null not checked (e.g. the RPC was not asked). */
  ok: boolean | null;
  detail: string;
}

/** The server verification as rows, in the order a verifier reasons: tree → memo → chain → verdict. */
export function verificationChecks(v: AnchorVerification): Check[] {
  const chain = v.onChain;
  return [
    { id: 'rootMatches', label: 'rootMatches', ok: v.rootMatches, detail: `root recomputed from the ${v.memberCount} stored members` },
    { id: 'countMatches', label: 'countMatches', ok: v.countMatches, detail: `${v.memberCount} members · batch says ${v.receiptCount}` },
    { id: 'proofsValid', label: 'proofsValid', ok: v.proofsValid, detail: 'every member proof folds to the root' },
    { id: 'memoMatches', label: 'memoMatches', ok: v.memoMatches, detail: 'the memo names this root and count' },
    {
      id: 'onChain.found',
      label: 'onChain.found',
      ok: chain?.checked ? chain.found && !chain.failed : null,
      detail: !chain?.checked
        ? 'chain not queried'
        : chain.error
          ? chain.error
          : `memo tx read back from the chain${chain.slot != null ? ' · slot ' + chain.slot : ''}${chain.memoMatches ? ' · memo on chain matches' : ''}`,
    },
    { id: 'valid', label: 'valid', ok: v.valid, detail: v.valid ? 'the anchor holds' : 'at least one check failed' },
  ];
}

/** The member to show: the one asked for (`?receipt=`) when it is in the batch, else the first. */
export function pickMember(detail: Pick<AnchorDetail, 'myReceipts'> | null, wanted: string | null | undefined): string | null {
  const members = detail?.myReceipts ?? [];
  if (wanted && members.some((m) => m.receiptHash === wanted)) return wanted;
  return members[0]?.receiptHash ?? null;
}

/** `sha256:abcd1234…9f0e` with a configurable head, for dense lists. */
export function shortHex(h: string | null | undefined, head = 8, tail = 4): string {
  if (!h) return '—';
  const hex = h.startsWith('sha256:') ? h.slice(7) : h;
  return hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

/** Where PROVE links to (`/proof/:root?receipt=`): the batch that holds the EXECUTION receipt, once there is one. */
export function proofLinkOf(proof: Pick<ProofInput, 'batch' | 'receipt'> | null | undefined): { root: string; receipt: string | null } | null {
  const root = proof?.batch?.root ?? proof?.receipt?.anchor?.root ?? null;
  return root ? { root, receipt: proof?.receipt?.receiptHash ?? null } : null;
}
