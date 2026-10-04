import { Component, OnInit, signal } from '@angular/core';
import type { ReplayRun } from './replay';

/**
 * The honest strip on top of every screen of the public build: this is a recording of a real
 * devnet run, not a live system, and nothing on it can be changed. The dates come from the
 * snapshot itself (meta.runs), so a re-recording cannot keep an old date by accident.
 */
@Component({
  selector: 'app-replay-banner',
  standalone: true,
  template: `
    <aside class="replay" role="note" aria-label="About this page">
      <strong>Replay of a real Solana devnet run</strong>
      <span class="replay__sep" aria-hidden="true">·</span>
      <span>read-only{{ dates() ? ' · recorded ' + dates() : '' }}</span>
      <span class="replay__sep" aria-hidden="true">·</span>
      <span>every transaction links to Solana Explorer</span>
      <span class="replay__sep" aria-hidden="true">·</span>
      <a href="https://github.com/sebdev89/life-engine-cryptobot-service" rel="noopener">source on GitHub</a>
    </aside>
  `,
  styles: `
    .replay {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      justify-content: center;
      align-items: baseline;
      padding: 6px 16px;
      background: var(--surface-2, #11161f);
      border-bottom: 1px solid var(--border-subtle, #1d2430);
      color: var(--text-2, #b8c0cc);
      font-size: var(--fs-xs, 12px);
      line-height: 1.5;
      text-align: center;
    }
    .replay strong {
      color: var(--text, #e8edf3);
      font-weight: 600;
    }
    .replay a {
      color: inherit;
      text-decoration: underline;
    }
    .replay__sep {
      color: var(--text-3, #6b7480);
    }
  `,
})
export class ReplayBanner implements OnInit {
  readonly dates = signal<string>('');

  ngOnInit(): void {
    void import('./replay')
      .then((m) => m.replaySnapshot())
      .then((s) => this.dates.set(formatRunDates(s.meta.runs)))
      .catch(() => this.dates.set(''));
  }
}

/** "3–4 Oct 2026" / "4 Oct 2026" — from the ISO dates of the recorded runs */
export function formatRunDates(runs: readonly ReplayRun[]): string {
  const ds = runs.map((r) => new Date(`${r.date}T12:00:00Z`)).filter((d) => !Number.isNaN(d.getTime()));
  if (!ds.length) return '';
  ds.sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d: Date, withMonth: boolean) =>
    withMonth
      ? `${d.getUTCDate()} ${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}`
      : `${d.getUTCDate()}`;
  const first = ds[0];
  const last = ds[ds.length - 1];
  if (first.toDateString() === last.toDateString()) return fmt(first, true);
  if (first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear()) {
    return `${fmt(first, false)}–${fmt(last, true)}`;
  }
  return `${fmt(first, true)} – ${fmt(last, true)}`;
}
