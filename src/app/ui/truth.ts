import { Component, computed, input } from '@angular/core';

/**
 * How much a visitor can trust one piece of data, said next to it. Solid outline = checkable by
 * anyone; dashed = taken from a record, a simulation or an estimate. Never stronger than the evidence.
 */
export type TruthKind = 'onchain' | 'recorded' | 'declared' | 'simulated' | 'estimated';

export const TRUTH: Readonly<Record<TruthKind, { label: string; means: string }>> = {
  onchain: { label: 'On-chain', means: 'A finalized Solana devnet transaction. No need to trust this page: open it on Solana Explorer.' },
  recorded: { label: 'Recorded', means: 'Written by the service in its audit trail or a signed receipt. Not itself on Solana.' },
  declared: { label: 'Declared', means: 'Stated by the task record or the operator. Taken at its word, and labelled so.' },
  simulated: { label: 'Simulated', means: 'A simulated economic result used to exercise the split. Not real revenue, however good it looks.' },
  estimated: { label: 'Estimated', means: 'An estimate attached by the provider, not a measured cost.' },
};

export const TRUTH_ORDER: readonly TruthKind[] = ['onchain', 'recorded', 'declared', 'simulated', 'estimated'];

@Component({
  selector: 'app-truth',
  standalone: true,
  template: `<span class="truth truth--{{ kind() }}" [attr.aria-label]="aria()" role="img" [attr.data-truth]="kind()"
    ><span class="truth__dot" aria-hidden="true"></span>{{ info().label }}<span class="truth__tip" aria-hidden="true">{{ info().means }}</span></span
  >`,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
    }
    .truth {
      --t: var(--text-2);
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0 7px;
      height: 19px;
      border-radius: var(--r-pill);
      border: 1px solid color-mix(in srgb, var(--t) 55%, transparent);
      background: color-mix(in srgb, var(--t) 9%, transparent);
      color: var(--t);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      white-space: nowrap;
      cursor: help;
    }
    .truth__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--t);
    }
    .truth--onchain {
      --t: var(--chain-2);
    }
    /* a finalized transaction "pings" twice when it appears, then holds still */
    .truth--onchain .truth__dot {
      animation: truth-ping 1.2s var(--ease) 2;
    }
    @keyframes truth-ping {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--t) 60%, transparent);
      }
      100% {
        box-shadow: 0 0 0 6px transparent;
      }
    }
    .truth--recorded {
      --t: var(--text-2);
    }
    .truth--declared {
      --t: var(--declared);
      border-style: dashed;
    }
    .truth--simulated {
      --t: var(--uncertain);
      border-style: dashed;
    }
    .truth--estimated {
      --t: var(--warn);
      border-style: dashed;
    }
    .truth--declared .truth__dot,
    .truth--simulated .truth__dot,
    .truth--estimated .truth__dot {
      background: transparent;
      box-shadow: inset 0 0 0 1.5px var(--t);
    }
    .truth__tip {
      position: absolute;
      z-index: 30;
      left: 50%;
      bottom: calc(100% + 8px);
      width: max-content;
      max-width: min(260px, 70vw);
      padding: 8px 10px;
      border-radius: var(--r-md);
      border: 1px solid var(--glass-border);
      background: var(--surface-tip);
      box-shadow: var(--shadow-2);
      color: var(--text);
      font-size: var(--fs-xs);
      font-weight: 400;
      letter-spacing: 0;
      line-height: 1.45;
      white-space: normal;
      text-align: left;
      display: none;
      transform: translateX(-50%);
      pointer-events: none;
    }
    /* hidden tips are display:none (not just transparent) so they never widen the page at 390 px */
    @media (hover: hover) {
      .truth:hover .truth__tip {
        display: block;
        animation: tip-in var(--dur-fast) var(--ease);
      }
    }
    @keyframes tip-in {
      from {
        opacity: 0;
      }
    }
  `,
})
export class TruthChip {
  readonly kind = input.required<TruthKind>();
  readonly info = computed(() => TRUTH[this.kind()]);
  readonly aria = computed(() => `${this.info().label}: ${this.info().means}`);
}

/** The key to the chips, once per page (in the footer). */
@Component({
  selector: 'app-truth-legend',
  standalone: true,
  imports: [TruthChip],
  template: `
    <dl class="legend" aria-label="How to read the data labels">
      @for (k of order; track k) {
        <div class="legend__row">
          <dt><app-truth [kind]="k" /></dt>
          <dd>{{ truth[k].means }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    .legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
      gap: 10px 20px;
      margin: 0;
    }
    .legend__row {
      display: grid;
      gap: 4px;
    }
    dt {
      margin: 0;
    }
    dd {
      margin: 0;
      color: var(--text-2);
      font-size: var(--fs-xs);
      line-height: 1.5;
    }
  `,
})
export class TruthLegend {
  readonly order = TRUTH_ORDER;
  readonly truth = TRUTH;
}
