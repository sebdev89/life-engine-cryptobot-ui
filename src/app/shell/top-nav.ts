import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** The judge's route through the product, in order; the console is last and quieter. */
export const NAV_LINKS: readonly { path: string; label: string; quiet?: boolean }[] = [
  { path: '/tower', label: 'Control Tower' },
  { path: '/live', label: 'Execution' },
  { path: '/proof', label: 'Proof' },
  { path: '/recovery', label: 'Recovery' },
  { path: '/policies', label: 'Policies' },
  { path: '/demo', label: 'Demo Mode' },
  { path: '/console', label: 'Console', quiet: true },
];

/**
 * The one header every screen shares (KAN-787 → KAN-789 → KAN-792). Wide: brand + the links in one
 * row. Narrow (≤ 900 px): brand + a Menu button, and the links open as a panel under the header —
 * the header itself stays one line at 390 px.
 */
@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="nav" [class.is-open]="open()">
      <a routerLink="/" class="nav__brand" aria-label="CryptoBot home" (click)="open.set(false)">
        <img class="nav__mark" src="/brand/cryptobot-mark.svg" alt="" width="22" height="22" />
        <span>CryptoBot</span>
        <span class="nav__tag">trusted agent execution</span>
      </a>
      <button
        type="button"
        class="nav__toggle"
        [attr.aria-expanded]="open()"
        aria-controls="primary-nav"
        (click)="open.set(!open())"
      >
        <span class="nav__burger" aria-hidden="true"><span></span><span></span><span></span></span>
        {{ open() ? 'Close' : 'Menu' }}
      </button>
      <nav class="nav__links" id="primary-nav" aria-label="Primary">
        @for (l of links; track l.path) {
          <a
            [routerLink]="l.path"
            routerLinkActive="is-active"
            ariaCurrentWhenActive="page"
            [class.nav__quiet]="l.quiet"
            (click)="open.set(false)"
            >{{ l.label }}</a
          >
        }
      </nav>
    </header>
  `,
  styles: `
    .nav {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-4);
      padding: var(--sp-3) 0;
      margin-bottom: var(--sp-5);
      border-bottom: 1px solid var(--border-subtle);
    }
    .nav__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      color: var(--text);
      font-weight: 700;
      letter-spacing: -0.01em;
      text-decoration: none;
      white-space: nowrap;
      border-radius: var(--r-sm);
    }
    .nav__mark {
      width: 22px;
      height: 22px;
      border-radius: 5px;
    }
    .nav__tag {
      font-family: var(--font-mono);
      font-size: var(--fs-2xs);
      font-weight: 400;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--text-3);
    }
    .nav__links {
      display: flex;
      gap: var(--sp-1);
    }
    .nav__links a {
      padding: var(--sp-1) var(--sp-3);
      border-radius: var(--r-pill);
      color: var(--text-2);
      font-size: var(--fs-sm);
      text-decoration: none;
      white-space: nowrap;
      transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
    }
    .nav__links a:hover {
      color: var(--text);
      background: var(--surface-2);
    }
    .nav__links a.is-active {
      color: var(--text);
      background: var(--surface-3);
    }
    .nav__links a.nav__quiet {
      color: var(--text-3);
    }
    .nav__links a.nav__quiet.is-active {
      color: var(--text);
    }
    .nav__toggle {
      display: none;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-1) var(--sp-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-pill);
      background: var(--surface-2);
      color: var(--text);
      font: inherit;
      font-size: var(--fs-sm);
      cursor: pointer;
    }
    .nav__burger {
      display: inline-grid;
      gap: 3px;
    }
    .nav__burger span {
      display: block;
      width: 14px;
      height: 2px;
      border-radius: 1px;
      background: currentColor;
    }
    @media (max-width: 1100px) {
      .nav__tag {
        display: none;
      }
    }
    @media (max-width: 900px) {
      .nav__toggle {
        display: inline-flex;
      }
      .nav__links {
        display: none;
        position: absolute;
        z-index: 20;
        top: calc(100% + 1px);
        left: 0;
        right: 0;
        flex-direction: column;
        gap: 2px;
        padding: var(--sp-2);
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        box-shadow: var(--shadow-2);
      }
      .nav.is-open .nav__links {
        display: flex;
      }
      .nav__links a {
        padding: var(--sp-3);
        border-radius: var(--r-md);
        font-size: var(--fs-base);
      }
    }
  `,
})
export class TopNav {
  readonly links = NAV_LINKS;
  readonly open = signal(false);

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }
}
