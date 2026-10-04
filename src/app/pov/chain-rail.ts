import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POV_CHAIN } from './pov-chain';

/**
 * The Proof of Value chain as one rail: Intent → … → Reward & Reputation. On the landing it plays once
 * (each link lights in turn as the value line reaches it); in the guided replay it shows where you
 * are. Every link opens that step of the replay; its one-sentence explanation shows on hover/focus.
 */
@Component({
  selector: 'app-chain-rail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="rail" [class.rail--intro]="intro()" [class.rail--tour]="active() !== null" aria-label="Proof of Value chain" [style.--progress]="progress()">
      <div class="rail__groups" aria-hidden="true">
        <span class="rail__group rail__group--op">One operation on Solana</span>
        <span class="rail__group rail__group--value">Who created the value, and who got paid</span>
      </div>
      <div class="rail__track">
      <span class="rail__line" aria-hidden="true"><span class="rail__fill"></span></span>
      @if (intro()) {
        <span class="rail__particles" aria-hidden="true"><span class="rail__p" style="--p: 0"></span><span class="rail__p" style="--p: 1"></span><span class="rail__p" style="--p: 2"></span></span>
      }
      <ol class="rail__list">
        @for (l of links; track l.n) {
          <li class="rail__item" [class.is-done]="active() !== null && l.n < active()!" [class.is-active]="l.n === active()" [style.--i]="l.n - 1">
            <a
              class="rail__node"
              [routerLink]="['/tour']"
              [queryParams]="{ step: l.n }"
              [attr.aria-current]="l.n === active() ? 'step' : null"
              [attr.aria-describedby]="'rail-tip-' + l.n"
            >
              <span class="rail__dot" aria-hidden="true">{{ l.n }}</span>
              <span class="rail__name">{{ l.name }}</span>
            </a>
            <span class="rail__tip" role="tooltip" [id]="'rail-tip-' + l.n">{{ l.says }}</span>
          </li>
        }
      </ol>
      </div>
    </nav>
  `,
  styleUrl: './chain-rail.scss',
})
export class ChainRail {
  /** the current step of the guided replay; null on the landing */
  readonly active = input<number | null>(null);
  /** play the one-time lighting sequence (landing) */
  readonly intro = input<boolean>(false);

  readonly links = POV_CHAIN;
  readonly progress = computed(() => {
    const a = this.active();
    return a === null ? 1 : (a - 1) / (POV_CHAIN.length - 1);
  });
}
