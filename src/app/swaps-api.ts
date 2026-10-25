import { apiFetch } from './cryptobot-api';

/**
 * KAN-1249 pilot swap orders (`/api/cryptobot/swaps`, see the service's SwapsController). Proposing simulates
 * and signs nothing; approving needs the order's nonce (only the configured approver receives it) and the
 * preview hash you saw; executing is the approver's, once.
 */
export type SwapDirection = 'SOL_USDC' | 'USDC_SOL';
export type SwapStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'SENT'
  | 'CONFIRMED'
  | 'UNKNOWN_SENT'
  | 'FAILED'
  | 'REJECTED'
  | 'EXPIRED';

export interface SwapView {
  id: string;
  status: SwapStatus;
  direction: SwapDirection;
  cluster: string;
  owner: string;
  inAmount: number;
  minOut: number;
  maxSlippageBps: number;
  previewHash: string;
  preview: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string;
  txSignature: string | null;
  error: string | null;
  createdAt: string;
  approvalNonce: string | null;
}

/** A refusal from the swap endpoints: the HTTP status and the service's stable reason (`swaps_disabled`, `not_approver`, …). */
export class SwapError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`${reason} (HTTP ${status})`);
    this.name = 'SwapError';
  }
}

async function swapJson(res: Response): Promise<SwapView> {
  if (res.ok) return (await res.json()) as SwapView;
  let reason = `http_${res.status}`;
  try {
    const body = (await res.json()) as { reason?: string };
    if (body?.reason) reason = body.reason;
  } catch {
    // no JSON body: keep the status as the reason
  }
  throw new SwapError(res.status, reason);
}

/** `amount` in base units (lamports for SOL→USDC, USDC units for USDC→SOL). The key makes a retried click the same order. */
export function createSwap(direction: SwapDirection, amount: number, maxSlippageBps: number, idempotencyKey: string): Promise<SwapView> {
  return apiFetch('/swaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ direction, amount, maxSlippageBps }),
  }).then(swapJson);
}

export function getSwap(id: string): Promise<SwapView> {
  return apiFetch(`/swaps/${encodeURIComponent(id)}`).then(swapJson);
}

export function approveSwap(id: string, nonce: string, previewHash: string): Promise<SwapView> {
  return apiFetch(`/swaps/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': nonce },
    body: JSON.stringify({ previewHash }),
  }).then(swapJson);
}

export function rejectSwap(id: string): Promise<SwapView> {
  return apiFetch(`/swaps/${encodeURIComponent(id)}/reject`, { method: 'POST' }).then(swapJson);
}

export function executeSwap(id: string): Promise<SwapView> {
  return apiFetch(`/swaps/${encodeURIComponent(id)}/execute`, { method: 'POST' }).then(swapJson);
}

export function reconcileSwap(id: string): Promise<SwapView> {
  return apiFetch(`/swaps/${encodeURIComponent(id)}/reconcile`, { method: 'POST' }).then(swapJson);
}
