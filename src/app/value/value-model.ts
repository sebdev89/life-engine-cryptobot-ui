import { DistributionSummary, PayoutStatus, ValueEvent } from '../value-events-api';

/** The five acceptance stages, in the fixed order of P-16: MERGED, BUILT, DEPLOYED, RUNNING, ACCEPTED. */
export const ACCEPTANCE_STAGES = ['MERGED', 'BUILT', 'DEPLOYED', 'RUNNING', 'ACCEPTED'] as const;

export interface StageRow {
  label: string;
  /** true = passed, false = failed, null = the API did not say (never shown as passed). */
  state: boolean | null;
}

export function acceptanceStages(ev: Pick<ValueEvent, 'acceptance'>): StageRow[] {
  const stages = ev.acceptance?.stages;
  return ACCEPTANCE_STAGES.map((label) => {
    const v = stages?.[label];
    return { label, state: v === true ? true : v === false ? false : null };
  });
}

export function statusLabel(s: ValueEvent['status']): string {
  return s === 'ANCHORED' ? 'Anchored on Solana' : 'Recorded (not anchored yet)';
}

export function statusClass(s: ValueEvent['status']): 'done' | 'active' {
  return s === 'ANCHORED' ? 'done' : 'active';
}

/** `abcdef…1234`; keeps a `sha256:` prefix. */
export function short(h: string | null | undefined, head = 8, tail = 6): string {
  if (!h) return '—';
  const p = h.startsWith('sha256:') ? 'sha256:' : '';
  const hex = p ? h.slice(7) : h;
  return hex.length <= head + tail + 1 ? h : `${p}${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function contributionSummary(ev: Pick<ValueEvent, 'contributions'>): { humans: number; agents: number } {
  const humans = ev.contributions.filter((c) => c.kind === 'HUMAN').length;
  return { humans, agents: ev.contributions.length - humans };
}

/** Devnet explorer link for a wallet address (KAN-830). */
export function explorerAddressUrl(wallet: string): string {
  return `https://explorer.solana.com/address/${encodeURIComponent(wallet)}?cluster=devnet`;
}

/** micro USD (1e-6) to a display string: `$0.004200`. Compute cost only; never economic value. */
export function formatMicroUsd(micro: number | null | undefined): string {
  if (micro === null || micro === undefined || Number.isNaN(micro)) return '—';
  return `$${(micro / 1_000_000).toFixed(6)}`;
}

export function ledgerTotal(rows: { totalUnits: number }[]): number {
  return rows.reduce((a, r) => a + r.totalUnits, 0);
}

export const LEDGER_GROUPS = [
  { value: 'identity', label: 'Identity' },
  { value: 'asset', label: 'Asset' },
  { value: 'project', label: 'Project' },
] as const;

export const UNITS_DISCLAIMER =
  'Contribution Units are an attribution primitive inside the protocol — not equity, not a promise of financial return.';

export const DISTRIBUTION_NOTE = 'devnet SOL stands in for stablecoin settlement in this demo.';

/** lamports to SOL, 4 decimals: `0.0500`. */
export function lamportsToSol(l: number | null | undefined): string {
  if (l === null || l === undefined || Number.isNaN(l)) return '—';
  return (l / 1_000_000_000).toFixed(4);
}

export function payoutClass(s: PayoutStatus): 'done' | 'active' | 'failed' | 'uncertain' {
  switch (s) {
    case 'CONFIRMED':
      return 'done';
    case 'FAILED':
      return 'failed';
    case 'UNFUNDED':
      return 'uncertain';
    default:
      return 'active';
  }
}

/** Label for the list column; null when nothing was distributed. */
export function paidLabel(d: DistributionSummary | null | undefined): string | null {
  if (!d) return null;
  if (d.status === 'COMPLETE') return 'Paid';
  if (d.status === 'PARTIAL') return 'Partially paid';
  return null;
}

export function txExplorerUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(sig)}?cluster=devnet`;
}

export function shortWallet(w: string): string {
  return w.length <= 11 ? w : `${w.slice(0, 4)}…${w.slice(-4)}`;
}
