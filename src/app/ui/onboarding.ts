import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from './i18n';
import { readPref, writePref } from './storage';
import { TruthChip } from './truth';

export const ONBOARDING_KEY = 'cb.onboarding.v1';

/**
 * "What you're looking at": three short cards on the first visit, in a corner (it never blocks the page).
 * Dismissed once, remembered in this browser; without storage it simply shows again next time.
 */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink, TPipe, TruthChip],
  template: `
    @if (open()) {
      <section class="ob" role="dialog" aria-modal="false" aria-labelledby="ob-title" data-testid="onboarding">
        <header class="ob__head">
          <p class="ob__count">{{ 'ob.count' | t: { n: step(), total: 3 } }}</p>
          <button type="button" class="ob__x" (click)="close()" [attr.aria-label]="'ob.close' | t" data-testid="onboarding-dismiss">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
          </button>
        </header>
        @switch (step()) {
          @case (1) {
            <h2 id="ob-title" class="ob__title">{{ 'ob.1.title' | t }}</h2>
            <p class="ob__body">{{ 'ob.1.body' | t }}</p>
          }
          @case (2) {
            <h2 id="ob-title" class="ob__title">{{ 'ob.2.title' | t }}</h2>
            <p class="ob__body">{{ 'ob.2.body' | t }}</p>
            <p class="ob__chips"><app-truth kind="onchain" /> <app-truth kind="recorded" /> <app-truth kind="declared" /> <app-truth kind="simulated" /></p>
          }
          @default {
            <h2 id="ob-title" class="ob__title">{{ 'ob.3.title' | t }}</h2>
            <p class="ob__body">{{ 'ob.3.body' | t }}</p>
          }
        }
        <div class="ob__dots" aria-hidden="true">
          @for (d of [1, 2, 3]; track d) {
            <span class="ob__dot" [class.on]="d === step()"></span>
          }
        </div>
        <footer class="ob__foot">
          <button type="button" class="ob__skip" (click)="close()">{{ 'ob.skip' | t }}</button>
          @if (step() < 3) {
            <button type="button" class="btn btn--primary ob__next" (click)="next()">{{ 'ob.next' | t }}</button>
          } @else {
            <a class="btn btn--primary ob__next" routerLink="/tour" [queryParams]="{ autoplay: 1 }" (click)="close()">{{ 'ob.start' | t }}</a>
          }
        </footer>
      </section>
    }
  `,
  styles: `
    .ob {
      position: fixed;
      z-index: 45;
      right: 16px;
      bottom: 16px;
      width: min(360px, calc(100vw - 32px));
      padding: 16px 18px 14px;
      border-radius: var(--r-lg);
      border: 1px solid var(--glass-border);
      background: var(--glass-strong);
      backdrop-filter: blur(18px) saturate(150%);
      -webkit-backdrop-filter: blur(18px) saturate(150%);
      box-shadow: var(--shadow-2), 0 0 0 1px color-mix(in srgb, var(--chain) 18%, transparent);
      animation: ob-in 420ms var(--ease) 600ms both;
    }
    .ob:focus {
      outline: none;
    }
    @keyframes ob-in {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
    .ob__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ob__count {
      margin: 0;
      color: var(--chain-2);
      font-size: var(--fs-xs);
      font-weight: 600;
    }
    .ob__x {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: var(--r-md);
      background: transparent;
      color: var(--text-2);
      cursor: pointer;
    }
    .ob__x:hover {
      color: var(--text);
      background: var(--glass-hover);
    }
    .ob__title {
      margin: 6px 0 6px;
      font-size: 1.12rem;
      letter-spacing: -0.01em;
    }
    .ob__body {
      margin: 0;
      color: var(--text-2);
      font-size: var(--fs-sm);
      line-height: 1.55;
    }
    .ob__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 0;
    }
    .ob__dots {
      display: flex;
      gap: 6px;
      margin: 14px 0 0;
    }
    .ob__dot {
      width: 6px;
      height: 6px;
      border-radius: 3px;
      background: var(--border-strong);
      transition: width var(--dur) var(--ease), background var(--dur) var(--ease);
    }
    .ob__dot.on {
      width: 18px;
      background: var(--chain-2);
    }
    .ob__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .ob__skip {
      border: 0;
      background: transparent;
      color: var(--text-2);
      font-size: var(--fs-sm);
      cursor: pointer;
      padding: 6px 4px;
      border-radius: var(--r-sm);
    }
    .ob__skip:hover {
      color: var(--text);
    }
    .ob__next {
      padding: 6px 14px;
    }
  `,
})
export class Onboarding {
  readonly open = signal(readPref(ONBOARDING_KEY) !== 'done');
  readonly step = signal(1);

  next(): void {
    this.step.set(Math.min(3, this.step() + 1));
  }

  close(): void {
    this.open.set(false);
    writePref(ONBOARDING_KEY, 'done');
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.close();
  }
}
