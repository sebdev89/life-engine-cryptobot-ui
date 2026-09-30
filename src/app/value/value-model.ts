import { ValueEvent } from '../value-events-api';

/** The five acceptance stages a ValueEvent must have passed to exist at all (AcceptancePolicy V1: otherwise the API answers 422). */
export const ACCEPTANCE_STAGES: readonly { key: string; label: string }[] = [
  { key: 'submitted', label: 'Work submitted' },
  { key: 'evidence', label: 'Evidence attached' },
  { key: 'checks', label: 'Checks passed' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'accepted', label: 'Accepted' },
];

export interface StageRow {
  label: string;
  ok: boolean;
  /** true when the API sent the stage; false when it is implied by the event existing. */
  reported: boolean;
}

/** Reported stages win; without them, every stage is implied passed, because an event with a failed stage is never recorded. */
export function acceptanceStages(ev: Pick<ValueEvent, 'acceptance'>): StageRow[] {
  const reported = ev.acceptance?.stages;
  if (reported && Object.keys(reported).length) {
    return Object.entries(reported).map(([label, ok]) => ({ label, ok: ok === true, reported: true }));
  }
  return ACCEPTANCE_STAGES.map((s) => ({ label: s.label, ok: true, reported: false }));
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
