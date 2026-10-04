import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopNav } from '../shell/top-nav';
import { TPipe } from '../ui/i18n';

/** The ten cases, in order; their copy lives in the dictionary (`uc.<id>.title` / `uc.<id>.line`). */
export const USE_CASES: readonly string[] = [
  'bounties',
  'oss-revenue',
  'ai-agencies',
  'compute',
  'royalties',
  'dao-treasury',
  'audit',
  'reputation',
  'underwriting',
  'api',
];

/**
 * `/use-cases`: where the same primitive could go next. Every card says ROADMAP — not built, because
 * none of it is: the only working case is the CryptoBot run this replay shows.
 */
@Component({
  selector: 'app-use-cases',
  standalone: true,
  imports: [RouterLink, TopNav, TPipe],
  template: `
    <main class="uc">
      <app-top-nav />
      <header class="uc__head">
        <h1>{{ 'uc.title' | t }}</h1>
        <p class="uc__lede">{{ 'uc.lede' | t }}</p>
      </header>
      <ol class="uc__grid" data-testid="use-cases">
        @for (id of cases; track id; let i = $index) {
          <li class="uc__card panel" [style.--k]="i">
            <span class="uc__badge" data-testid="roadmap-badge">{{ 'uc.badge' | t }}</span>
            <h2 class="uc__title">{{ 'uc.' + id + '.title' | t }}</h2>
            <p class="uc__line">{{ 'uc.' + id + '.line' | t }}</p>
          </li>
        }
      </ol>
      <p class="uc__foot t-2">{{ 'uc.foot' | t }} <a routerLink="/tour">{{ 'uc.foot.link' | t }}</a></p>
    </main>
  `,
  styles: `
    .uc {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 var(--sp-5) var(--sp-6);
    }
    @media (max-width: 640px) {
      .uc {
        padding: 0 var(--sp-4) var(--sp-5);
      }
    }
    .uc__head h1 {
      margin: var(--sp-2) 0 var(--sp-2);
      font-size: clamp(1.7rem, 3.4vw, 2.4rem);
      font-weight: 750;
      letter-spacing: -0.025em;
    }
    .uc__lede {
      margin: 0 0 var(--sp-5);
      max-width: 62ch;
      color: var(--text-2);
      font-size: 1.02rem;
    }
    .uc__grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: var(--sp-4);
    }
    .uc__card {
      display: grid;
      align-content: start;
      gap: 8px;
      padding: var(--sp-4);
      border-style: dashed;
    }
    .uc__badge {
      justify-self: start;
      padding: 1px 8px;
      border-radius: var(--r-pill);
      border: 1px dashed color-mix(in srgb, var(--warn) 60%, transparent);
      color: var(--warn);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .uc__title {
      margin: 0;
      font-size: var(--fs-md);
    }
    .uc__line {
      margin: 0;
      color: var(--text-2);
      font-size: var(--fs-sm);
      line-height: 1.55;
    }
    .uc__foot {
      margin-top: var(--sp-5);
    }
  `,
})
export class UseCases {
  readonly cases = USE_CASES;
}
