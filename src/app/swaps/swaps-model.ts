import { SwapDirection, SwapStatus, SwapView } from '../swaps-api';

/** Base-unit decimals of the input and output of each direction. */
export const DECIMALS: Record<SwapDirection, { in: number; out: number; inSym: string; outSym: string }> = {
  SOL_USDC: { in: 9, out: 6, inSym: 'SOL', outSym: 'USDC' },
  USDC_SOL: { in: 6, out: 9, inSym: 'USDC', outSym: 'SOL' },
};

/** "0.05" SOL → 50 000 000 lamports. Null for anything that is not a positive decimal with at most `decimals` places. */
export function toBaseUnits(text: string, decimals: number): number | null {
  const t = text.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  if (frac.length > decimals) return null;
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals));
  if (units <= 0n || units > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(units);
}

/** 50 000 000, 9 → "0.05". */
export function fromBaseUnits(units: number, decimals: number): string {
  const s = BigInt(units).toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export interface PreviewSummary {
  quotedOut: number | null;
  priceImpactPct: string | null;
  route: string[];
  simulationOk: boolean | null;
  computeUnits: number | null;
}

/** What the approver needs from the stored preview (the service's canonical JSON); unknown fields are null. */
export function previewSummary(preview: string): PreviewSummary {
  try {
    const p = JSON.parse(preview) as {
      quote?: { outAmount?: string | number; priceImpactPct?: string; routePlan?: { swapInfo?: { label?: string } }[] };
      simulation?: { ok?: boolean; units?: number };
    };
    const out = p.quote?.outAmount;
    return {
      quotedOut: out === undefined || out === null || Number.isNaN(Number(out)) ? null : Number(out),
      priceImpactPct: p.quote?.priceImpactPct ?? null,
      route: (p.quote?.routePlan ?? []).map((r) => r.swapInfo?.label).filter((l): l is string => !!l),
      simulationOk: typeof p.simulation?.ok === 'boolean' ? p.simulation.ok : null,
      computeUnits: typeof p.simulation?.units === 'number' ? p.simulation.units : null,
    };
  } catch {
    return { quotedOut: null, priceImpactPct: null, route: [], simulationOk: null, computeUnits: null };
  }
}

/** States the order can still move from (the screen keeps refreshing them). */
export const LIVE: ReadonlySet<SwapStatus> = new Set(['PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'SENT', 'UNKNOWN_SENT']);

/** Which buttons make sense right now. Approve needs the nonce, which only the approver receives. */
export function actions(o: SwapView, now: number): { approve: boolean; reject: boolean; execute: boolean; reconcile: boolean } {
  const inWindow = Date.parse(o.expiresAt) > now;
  return {
    approve: o.status === 'PENDING_APPROVAL' && inWindow && !!o.approvalNonce,
    reject: o.status === 'PENDING_APPROVAL',
    execute: o.status === 'APPROVED' && inWindow,
    reconcile: o.status === 'SENT' || o.status === 'UNKNOWN_SENT' || o.status === 'EXECUTING',
  };
}

/** "1:42" left in the approval/execution window, or null once it is over. */
export function windowLeft(expiresAt: string, now: number): string | null {
  const ms = Date.parse(expiresAt) - now;
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function explorerTx(signature: string, cluster: string): string {
  const c = cluster === 'mainnet-beta' ? '' : `?cluster=${encodeURIComponent(cluster)}`;
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}${c}`;
}

/** Plain words for the service's stable refusal reasons. */
export function reasonText(reason: string): string {
  const known: Record<string, string> = {
    swaps_disabled: 'Swaps are off in this environment (cryptobot.swaps.enabled=false).',
    not_approver: 'You are not the configured approver.',
    no_approver_configured: 'No approver is configured (cryptobot.swaps.approver-user-id).',
    not_admin: 'Approving needs CRYPTOBOT_ADMIN.',
    token_not_fresh: 'Your session is too old to approve: sign in again.',
    csrf_mismatch: 'The approval nonce did not match: reload the order.',
    preview_mismatch: 'The preview changed since you looked at it: reload the order.',
    approval_expired: 'The approval window elapsed: propose again.',
    execution_expired: 'The execution window elapsed: propose again.',
    simulation_failed: 'The transaction did not simulate: nothing was proposed.',
    amount_out_of_bounds: 'Amount outside the pilot limits.',
    slippage_out_of_bounds: 'Slippage above the pilot limit.',
    too_many_proposals: 'Too many proposals in the last hour.',
    executor_busy: 'Another order is executing right now.',
    not_approved: 'The order is not approved (or was already executed).',
    signer_unavailable: 'The signer is not available.',
  };
  return known[reason] ?? reason;
}
