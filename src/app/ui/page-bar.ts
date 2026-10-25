import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One counter of the bar: `3 open`. `tone` paints it as ok, warn or bad. */
export interface PageStat {
  readonly label: string;
  readonly value: number | string;
  readonly tone?: 'neutral' | 'ok' | 'warn' | 'bad';
  readonly title?: string;
}

/**
 * KAN-1362: page header in ONE row (title · inline counters · actions on the right). Replaces the hero + lede + KPI
 * rows that pushed the first panel below the fold. Actions are projected (`<app-page-bar>…buttons…</app-page-bar>`);
 * an optional subtitle goes in `[subtitle]` and renders muted next to the title.
 */
@Component({
  selector: 'app-page-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-bar">
      <h1 class="page-bar__title" [attr.id]="titleId()">
        {{ title() }}
        @if (subtitle()) {
          <span class="page-bar__sub">{{ subtitle() }}</span>
        }
      </h1>
      @if (stats().length) {
        <ul class="page-bar__stats" aria-label="Summary">
          @for (s of stats(); track s.label) {
            <li class="page-bar__stat" [attr.data-tone]="s.tone ?? 'neutral'" [attr.title]="s.title ?? null">
              <strong>{{ s.value }}</strong> {{ s.label }}
            </li>
          }
        </ul>
      }
      <div class="page-bar__actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .page-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-2) var(--sp-4);
      margin: var(--sp-4) 0 var(--sp-3);
    }
    .page-bar__title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 650;
      line-height: var(--lh-tight);
    }
    .page-bar__sub {
      margin-left: var(--sp-1);
      color: var(--text-3);
      font-size: var(--fs-xs);
      font-weight: 400;
    }
    .page-bar__stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .page-bar__stat {
      padding: 2px var(--sp-2);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--surface-2);
      color: var(--text-2);
      font-size: var(--fs-xs);
      white-space: nowrap;
    }
    .page-bar__stat strong {
      color: var(--text);
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      font-variant-numeric: tabular-nums;
    }
    .page-bar__stat[data-tone='ok'] {
      border-color: color-mix(in srgb, var(--ok) 40%, transparent);
    }
    .page-bar__stat[data-tone='ok'] strong {
      color: var(--ok);
    }
    .page-bar__stat[data-tone='warn'] {
      border-color: color-mix(in srgb, var(--warn) 50%, transparent);
    }
    .page-bar__stat[data-tone='warn'] strong {
      color: var(--warn);
    }
    .page-bar__stat[data-tone='bad'] {
      border-color: color-mix(in srgb, var(--err) 50%, transparent);
    }
    .page-bar__stat[data-tone='bad'] strong {
      color: var(--err);
    }
    .page-bar__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-2);
      margin-left: auto;
    }
  `,
})
export class PageBar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly titleId = input<string | null>(null);
  readonly stats = input<readonly PageStat[]>([]);
}
