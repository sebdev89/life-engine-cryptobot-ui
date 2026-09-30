import { Component, input } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DemoStep, Stage, formatDuration } from '../live-model';

/**
 * Execution Detail: the 8 stages of a proposal as a pipeline (one node per stage, state
 * + duration) and as an expandable list (evidence + the original steps of the 12-step model, and
 * PROVE's anchor/inclusion checks). Presentational only: everything comes from `buildStages`.
 */
@Component({
  selector: 'app-execution-detail',
  standalone: true,
  imports: [SlicePipe, RouterLink],
  templateUrl: './execution-detail.html',
  styleUrl: './execution-detail.scss',
})
export class ExecutionDetail {
  readonly stages = input<Stage[]>([]);
  /** PROVE opens the Proof view of its batch (`/proof/:root?receipt=`) once the receipt is anchored. */
  readonly proofLink = input<{ root: string; receipt: string | null } | null>(null);

  duration(s: Stage): string {
    if (s.running) return s.durationMs !== null ? `en curso · ${formatDuration(s.durationMs)}` : 'en curso';
    if (s.id === 'INTENT' && s.state === 'done') return 't0';
    return formatDuration(s.durationMs);
  }

  /** Pipeline node: no room for words, the pulse already says it is running. */
  short(s: Stage): string {
    if (s.id === 'INTENT' && s.state === 'done') return 't0';
    return s.running && s.durationMs === null ? '…' : formatDuration(s.durationMs);
  }

  /** Open by default only what needs eyes: the stage in progress or one that went wrong. */
  opensByDefault(s: Stage): boolean {
    return s.state === 'active' || s.state === 'failed' || s.state === 'uncertain';
  }

  glyph(s: DemoStep | Stage): string {
    switch (s.state) {
      case 'done':
        return '✓';
      case 'failed':
        return '✗';
      case 'uncertain':
        return '?';
      case 'active':
        return '●';
      case 'skipped':
        return '–';
      default:
        return '○';
    }
  }

  focus(id: string): void {
    const el = typeof document !== 'undefined' ? document.getElementById(`stage-${id}`) : null;
    const details = el?.querySelector('details');
    if (details) details.open = true;
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
