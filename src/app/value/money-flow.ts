import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Payout } from '../value-events-api';
import { HashChip } from '../ui/hash';
import { TruthChip, TruthKind } from '../ui/truth';
import { bpsPercent, lamportsToSol, txExplorerUrl } from './value-model';

export interface FlowPart {
  label: string;
  lamports: number;
  bps: number | null;
  /** the part that is paid out to the contributors (it fans out into the payouts row) */
  pool?: boolean;
  tone: 'pool' | 'fee' | 'retained';
}

export interface FlowGeometry {
  /** left edge and width of each part, in % of the bar */
  parts: { x: number; w: number }[];
  /** the pool part's span, where the fan to the payouts starts */
  pool: { x: number; w: number } | null;
  payouts: { x: number; w: number }[];
}

/** Pure: widths proportional to lamports; the pool fans out over the full width into the payouts. */
export function flowGeometry(total: number, parts: readonly FlowPart[], payouts: readonly { lamports: number }[]): FlowGeometry {
  const sum = (xs: readonly { lamports: number }[]) => xs.reduce((a, p) => a + Math.max(0, p.lamports), 0);
  const spans = (xs: readonly { lamports: number }[], of: number) => {
    let x = 0;
    return xs.map((p) => {
      const w = of > 0 ? (Math.max(0, p.lamports) / of) * 100 : 0;
      const s = { x, w };
      x += w;
      return s;
    });
  };
  const ps = spans(parts, total > 0 ? total : sum(parts));
  const i = parts.findIndex((p) => p.pool);
  const pool = parts.length === 0 ? { x: 0, w: 100 } : i >= 0 ? ps[i] : null;
  return { parts: ps, pool, payouts: spans(payouts, sum(payouts)) };
}

/**
 * Where the money went, as one picture: the amount, how the policy split it, and the transfers to each
 * contributor's wallet with their Solana transaction. Amounts are the server's, never recomputed here.
 */
@Component({
  selector: 'app-money-flow',
  standalone: true,
  imports: [RouterLink, HashChip, TruthChip],
  template: `
    <figure class="mf" data-testid="money-flow">
      <figcaption class="mf__cap">
        <span class="mf__amount mono">{{ sol(total()) }} SOL</span>
        <span class="t-2">{{ totalLabel() }}</span>
        <app-truth [kind]="totalTruth()" />
      </figcaption>

      <div class="mf__bar mf__bar--total" aria-hidden="true"><span class="mf__fill mf__fill--{{ totalTruth() }}" style="--d: 0"></span></div>

      @if (parts().length) {
        <div class="mf__bar mf__bar--split" aria-hidden="true">
          @for (p of parts(); track p.label; let i = $index) {
            <span class="mf__seg mf__seg--{{ p.tone }}" [style.left.%]="geo().parts[i].x" [style.width.%]="geo().parts[i].w" style="--d: 1"></span>
          }
        </div>
        <ul class="mf__legend">
          @for (p of parts(); track p.label) {
            <li><span class="mf__sw mf__sw--{{ p.tone }}" aria-hidden="true"></span>{{ p.label }} <b class="mono">{{ pct(p.bps) }}</b> <span class="mono t-2">{{ sol(p.lamports) }} SOL</span></li>
          }
        </ul>
      }

      @if (geo().pool; as pool) {
        @if (payouts().length) {
          <svg class="mf__fan" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
            @for (s of geo().payouts; track $index) {
              <path [attr.d]="fan(pool, s)" class="mf__band" [style.--d]="2 + $index * 0.15" />
            }
          </svg>
          <div class="mf__bar mf__bar--payouts" aria-hidden="true">
            @for (s of geo().payouts; track $index) {
              <span class="mf__seg mf__seg--pay" [style.left.%]="s.x" [style.width.%]="s.w" [style.--d]="2.4 + $index * 0.15"></span>
            }
          </div>
          <ol class="mf__pays">
            @for (p of payouts(); track $index) {
              <li class="mf__pay">
                <a class="mf__who" [routerLink]="['/value/identities', p.identityId]">{{ p.displayName }}</a>
                <span class="mono mf__sol">{{ sol(p.lamports) }} SOL</span>
                @if (p.txSignature; as sig) {
                  <app-hash [value]="sig" label="payout transaction" [href]="p.explorerUrl ?? txUrl(sig)" [head]="6" [tail]="6" />
                  @if (p.status === 'CONFIRMED') {
                    <app-truth kind="onchain" />
                  } @else {
                    <span class="st-badge st--uncertain">{{ p.status }}</span>
                  }
                } @else {
                  <span class="st-badge st--uncertain">{{ p.status }}</span>
                }
              </li>
            }
          </ol>
        }
      }
    </figure>
  `,
  styleUrl: './money-flow.scss',
})
export class MoneyFlow {
  readonly total = input.required<number>();
  readonly totalLabel = input<string>('');
  readonly totalTruth = input<TruthKind>('recorded');
  readonly parts = input<FlowPart[]>([]);
  readonly payouts = input<Payout[]>([]);

  readonly geo = computed(() => flowGeometry(this.total(), this.parts(), this.payouts()));
  readonly sol = lamportsToSol;
  readonly pct = bpsPercent;
  readonly txUrl = txExplorerUrl;

  /** a band from the pool's span (top) to one payout's span (bottom), as a smooth S-curve */
  fan(pool: { x: number; w: number }, s: { x: number; w: number }): string {
    const pTotal = this.geo().payouts.reduce((a, p) => a + p.w, 0) || 100;
    const tx0 = pool.x + (s.x / pTotal) * pool.w;
    const tx1 = tx0 + (s.w / pTotal) * pool.w;
    const bx0 = s.x + 0.4;
    const bx1 = Math.max(bx0 + 0.2, s.x + s.w - 0.4);
    return `M${tx0},0 C${tx0},14 ${bx0},14 ${bx0},28 L${bx1},28 C${bx1},14 ${tx1},14 ${tx1},0 Z`;
  }
}
