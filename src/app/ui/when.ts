import { Component, computed, input } from '@angular/core';
import { localDateTime, slotLabel, utcStamp } from './format';

/** A moment in the visitor's own time zone (UTC in the tooltip), with the Solana slot when there is one. */
@Component({
  selector: 'app-when',
  standalone: true,
  template: `<time class="when" [attr.datetime]="iso()" [title]="utc()">{{ local() }}</time
    >@if (slot() !== null && slot() !== undefined) {<span class="when__slot"> · slot <span class="mono">{{ slotText() }}</span></span>}`,
  styles: `
    .when {
      font-variant-numeric: tabular-nums;
    }
    .when__slot {
      color: var(--text-2);
    }
  `,
})
export class When {
  readonly at = input<string | number | null | undefined>(null);
  readonly slot = input<number | null | undefined>(null);
  readonly local = computed(() => localDateTime(this.at()));
  readonly utc = computed(() => utcStamp(this.at()));
  readonly iso = computed(() => {
    const a = this.at();
    if (a === null || a === undefined || a === '') return null;
    const d = new Date(a);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  });
  readonly slotText = computed(() => slotLabel(this.slot()));
}
