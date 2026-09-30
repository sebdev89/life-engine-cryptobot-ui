/**
 * Client for the Decision Receipts read side (`/api/cryptobot/receipts/**`, `/proposals/{id}/receipts`,
 * `/wallets/{id}/receipts`, `/anchors/**`). Shapes mirror the Java records (KAN-391, KAN-394);
 * the only things computed here are display helpers, and they are pure.
 */
import { apiFetch, throwHttp } from './cryptobot-api';

/** Filled by the anchoring batch once its memo transaction is FINALIZED on devnet; outside the receipt's hash and signature. */
export interface ReceiptAnchor {
  chain: string;
  tx: string;
  slot: number | null;
  root: string;
  /** Merkle siblings, leaf up: `L:sha256:…` / `R:sha256:…`. */
  proof: string[];
}

export interface ReceiptBody {
  kind: string;
  agentId: string;
  reproducibility: string;
  parents: string[];
  model: { ref: string; provider: string | null } | null;
  engine: { id: string; version: string } | null;
  runtime: { runId: string | null } | null;
  output: { hash: string; schema: string | null };
  completedAt: string;
}

export interface IntelligenceReceipt {
  receiptHash: string;
  body: ReceiptBody;
  signature: { alg: string; keyId: string };
  anchor: ReceiptAnchor | null;
  createdAt: string;
}

/** `POST /receipts/{hash}/verify`: the receipt's own checks (unwrapped) plus its Merkle inclusion. */
export interface ReceiptVerification {
  receiptHash: string;
  valid: boolean;
  hashMatchesCanonical: boolean;
  bodyMatchesCanonical: boolean;
  signatureValid: boolean;
  parentsPresent: boolean;
  keyId: string | null;
  level: string;
  reproduced: boolean | null;
  anchor: {
    anchored: boolean;
    status: string | null;
    chain: string | null;
    tx: string | null;
    slot: number | null;
    root: string | null;
    proof: string[];
    proofValid: boolean | null;
    explorerUrl: string | null;
  };
}

export interface AnchorBatch {
  root: string;
  chain: string;
  status: 'PENDING' | 'SUBMITTED' | 'FINALIZED' | 'FAILED' | 'ABANDONED';
  memo: string;
  receiptCount: number;
  tx: string | null;
  slot: number | null;
  attempts: number;
  createdAt: string;
  finalizedAt: string | null;
}

export interface AnchorView {
  anchor: AnchorBatch;
  explorerUrl: string | null;
}

/** `GET /anchors/{root}`: one batch plus the caller's receipts in it (hash + Merkle siblings). */
export interface AnchorDetail extends AnchorView {
  myReceipts: { root: string; receiptHash: string; proof: string[] }[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return throwHttp(res);
  }
  return (await res.json()) as T;
}

export function listProposalReceipts(proposalId: string): Promise<IntelligenceReceipt[]> {
  return apiFetch(`/proposals/${proposalId}/receipts`).then((r) => json<IntelligenceReceipt[]>(r));
}

export function listWalletReceipts(walletId: string, limit = 12): Promise<IntelligenceReceipt[]> {
  return apiFetch(`/wallets/${walletId}/receipts?limit=${limit}`).then((r) => json<IntelligenceReceipt[]>(r));
}

export function verifyReceipt(receiptHash: string): Promise<ReceiptVerification> {
  return apiFetch(`/receipts/${receiptHash}/verify`, { method: 'POST' }).then((r) => json<ReceiptVerification>(r));
}

export function listAnchors(limit = 5): Promise<AnchorView[]> {
  return apiFetch(`/anchors?limit=${limit}`).then((r) => json<AnchorView[]>(r));
}

export function getAnchor(root: string): Promise<AnchorDetail> {
  return apiFetch(`/anchors/${root}`).then((r) => json<AnchorDetail>(r));
}

// ---- pure display helpers (tested) ----

/** Same rule as `SolanaCluster.explorerTxUrl` in the service: devnet links carry `?cluster=devnet`, mainnet none. */
export function explorerTxUrl(chain: string | null | undefined, tx: string | null | undefined): string | null {
  if (!chain || !tx || !chain.toLowerCase().startsWith('solana')) {
    return null;
  }
  const suffix = chain.toLowerCase().endsWith('devnet') ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${tx}${suffix}`;
}

/** `sha256:ab12…ef34` — enough to eyeball, never enough to type. */
export function shortHash(h: string | null | undefined): string {
  if (!h) {
    return '—';
  }
  const hex = h.startsWith('sha256:') ? h.slice(7) : h;
  return `${h.startsWith('sha256:') ? 'sha256:' : ''}${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

export function shortSig(s: string | null | undefined): string {
  return s ? `${s.slice(0, 8)}…${s.slice(-6)}` : '—';
}

/** One line for the anchor column: what the receipt can prove about its place on the chain today. */
export function anchorLabel(a: ReceiptAnchor | null | undefined): string {
  if (!a || !a.tx) {
    return 'not anchored yet';
  }
  const where = a.chain.replace('solana-', '');
  return a.slot != null ? `anchored · ${where} · slot ${a.slot}` : `anchored · ${where}`;
}

/** Sorted the way the pipeline runs, so the list reads as a story instead of by hash. */
export const KIND_ORDER: readonly string[] = [
  'WALLET_SNAPSHOT',
  'HUMAN_IDEA',
  'MARKET_ANALYSIS',
  'RISK_DECISION',
  'STRATEGY',
  'SIMULATION',
  'EXECUTION',
  'PROJECT_ANALYSIS',
];

export function sortReceipts(receipts: readonly IntelligenceReceipt[]): IntelligenceReceipt[] {
  const rank = (r: IntelligenceReceipt) => {
    const i = KIND_ORDER.indexOf(r.body.kind);
    return i < 0 ? KIND_ORDER.length : i;
  };
  return [...receipts].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || rank(a) - rank(b));
}
