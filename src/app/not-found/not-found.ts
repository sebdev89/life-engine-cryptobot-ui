import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopNav } from '../shell/top-nav';
import { TPipe } from '../ui/i18n';

/** Any path the replay does not have. Says so plainly and offers the two ways back in. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TopNav, TPipe],
  template: `
    <main class="nf">
      <app-top-nav />
      <section class="nf__card panel" aria-labelledby="nf-title" data-testid="not-found">
        <svg class="nf__mark" viewBox="0 0 120 40" aria-hidden="true">
          <line x1="6" y1="20" x2="48" y2="20" />
          <circle cx="6" cy="20" r="5" />
          <circle cx="34" cy="20" r="5" />
          <circle class="nf__gap" cx="62" cy="20" r="5" />
          <line class="nf__broken" x1="76" y1="20" x2="114" y2="20" />
          <circle cx="90" cy="20" r="5" />
          <circle cx="114" cy="20" r="5" />
        </svg>
        <h1 id="nf-title">{{ 'nf.title' | t }}</h1>
        <p class="nf__body">{{ 'nf.body' | t }}</p>
        <div class="nf__cta">
          <a class="btn btn--primary" routerLink="/tour">{{ 'nf.tour' | t }}</a>
          <a class="btn" routerLink="/">{{ 'nf.home' | t }}</a>
        </div>
      </section>
    </main>
  `,
  styles: `
    .nf {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 var(--sp-5) var(--sp-6);
    }
    @media (max-width: 640px) {
      .nf {
        padding: 0 var(--sp-4) var(--sp-5);
      }
    }
    .nf__card {
      max-width: 560px;
      margin: clamp(24px, 8vh, 80px) auto 0;
      padding: var(--sp-6) var(--sp-5);
      text-align: center;
    }
    .nf__mark {
      width: 160px;
      height: 54px;
      fill: var(--bg);
      stroke: var(--chain-2);
      stroke-width: 2;
    }
    .nf__gap {
      stroke: var(--uncertain);
      stroke-dasharray: 3 3;
    }
    .nf__broken {
      stroke: var(--border-strong);
      stroke-dasharray: 4 4;
    }
    h1 {
      margin: var(--sp-3) 0 var(--sp-2);
      font-size: 1.6rem;
      letter-spacing: -0.02em;
    }
    .nf__body {
      margin: 0 auto;
      max-width: 44ch;
      color: var(--text-2);
    }
    .nf__cta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--sp-3);
      margin-top: var(--sp-5);
    }
  `,
})
export class NotFound {}
