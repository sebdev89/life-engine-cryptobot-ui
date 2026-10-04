import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../ui/i18n';
import { POV_CHAIN } from './pov-chain';

interface MapNode {
  n: number;
  route: string[];
  fragment?: string;
  /** draws the line down/up to the Solana band */
  touchesChain?: boolean;
}

/**
 * The system as a map: the agent's operation on top, the value record below, and Solana devnet in the
 * middle as the one ledger both write to (the operation's transfer, the ValueEvent's anchor, the payouts).
 * Each node opens the screen where that step can be inspected.
 */
@Component({
  selector: 'app-pov-map',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <div class="map" data-testid="pov-map">
      <p class="map__lane">{{ 'map.lane.op' | t }}</p>
      <ol class="map__row" start="1">
        @for (m of top(); track m.n) {
          <li class="map__cell" [class.map__cell--down]="m.touchesChain">
            <a class="node" [routerLink]="m.route" [fragment]="m.fragment">
              <span class="node__n" aria-hidden="true">{{ m.n }}</span>
              <span class="node__name">{{ name(m.n) }}</span>
              <span class="node__says">{{ 'chain.' + m.n | t }}</span>
            </a>
          </li>
        }
      </ol>

      <div class="band" role="presentation">
        <span class="band__label">{{ 'map.band' | t }}</span>
        <span class="band__tx band__tx--op">{{ 'map.tx.op' | t }}</span>
        <span class="band__tx band__tx--anchor">{{ 'map.tx.anchor' | t }}</span>
        <span class="band__tx band__tx--pay">{{ 'map.tx.pay' | t }}</span>
      </div>

      <ol class="map__row map__row--value" start="6">
        @for (m of bottom(); track m.n) {
          <li class="map__cell" [class.map__cell--up]="m.touchesChain">
            <a class="node node--value" [routerLink]="m.route" [fragment]="m.fragment">
              <span class="node__n" aria-hidden="true">{{ m.n }}</span>
              <span class="node__name">{{ name(m.n) }}</span>
              <span class="node__says">{{ 'chain.' + m.n | t }}</span>
            </a>
          </li>
        }
      </ol>
      <p class="map__lane">{{ 'map.lane.value' | t }}</p>
    </div>
  `,
  styleUrl: './pov-map.scss',
})
export class PovMap {
  /** the recorded ValueEvent and revenue event, when known (links fall back to the lists) */
  readonly valueEventId = input<string | null>(null);
  readonly revenueId = input<string | null>(null);

  readonly top = computed<MapNode[]>(() => [
    { n: 1, route: ['/live'] },
    { n: 2, route: ['/live'] },
    { n: 3, route: ['/policies'] },
    { n: 4, route: ['/live'] },
    { n: 5, route: ['/tower'], touchesChain: true },
  ]);

  readonly bottom = computed<MapNode[]>(() => {
    const ev = this.valueEventId();
    const rev = this.revenueId();
    return [
      { n: 6, route: ev ? ['/value', ev] : ['/value'] },
      { n: 7, route: ev ? ['/value', ev] : ['/value'], fragment: ev ? 'verify' : undefined, touchesChain: true },
      { n: 8, route: ['/value/ledger'] },
      { n: 9, route: rev ? ['/value/revenue', rev] : ['/value/revenue'], touchesChain: true },
    ];
  });

  name(n: number): string {
    return POV_CHAIN[n - 1].name;
  }
}
