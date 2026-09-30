import { ValueEvent } from '../value-events-api';

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
