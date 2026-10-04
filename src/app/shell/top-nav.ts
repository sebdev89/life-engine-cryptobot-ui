import { Component, HostListener, inject, signal } from '@angular/core';
import { I18n, TPipe } from '../ui/i18n';
import { ThemeService } from '../ui/theme';
import { Shortcuts } from '../ui/shortcuts';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { OPERATOR_ONLY_PATHS, PUBLIC_DEMO } from '../public-demo/flag';

/** The judge's route through the product, in order; the console is last and quieter. */
const ALL_NAV_LINKS: readonly { path: string; label: string; quiet?: boolean }[] = [
  { path: '/tour', label: 'Replay' },
  { path: '/tower', label: 'Control Tower' },
  { path: '/live', label: 'Execution' },
  { path: '/proof', label: 'Proof' },
  { path: '/value', label: 'Value' },
  { path: '/recovery', label: 'Recovery' },
  { path: '/policies', label: 'Policies' },
  { path: '/demo', label: 'Demo Mode' },
  { path: '/console', label: 'Console', quiet: true },
  { path: '/use-cases', label: 'Use cases', quiet: true },
];

/** In the public replay the operator screens are not links (they are not routes either). */
export const NAV_LINKS = PUBLIC_DEMO ? ALL_NAV_LINKS.filter((l) => !OPERATOR_ONLY_PATHS.has(l.path.slice(1))) : ALL_NAV_LINKS;

/**
 * The one header every screen shares. Wide: brand + the links in one
 * row. Narrow (≤ 900 px): brand + a Menu button, and the links open as a panel under the header —
 * the header itself stays one line at 390 px.
 */
@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <header class="nav" [class.is-open]="open()">
      <a routerLink="/" class="nav__brand" aria-label="CryptoBot home" (click)="open.set(false)">
        <img class="nav__mark" src="brand/cryptobot-mark.svg" alt="" width="22" height="22" />
        <span>CryptoBot</span>
        <span class="nav__tag">{{ 'nav.tag' | t }}</span>
      </a>
      <button
        type="button"
        class="nav__toggle"
        [attr.aria-expanded]="open()"
        aria-controls="primary-nav"
        (click)="open.set(!open())"
      >
        <span class="nav__burger" aria-hidden="true"><span></span><span></span><span></span></span>
        {{ (open() ? 'nav.close' : 'nav.menu') | t }}
      </button>
      <nav class="nav__links" id="primary-nav" aria-label="Primary">
        @for (l of links; track l.path) {
          <a
            [routerLink]="l.path"
            routerLinkActive="is-active"
            ariaCurrentWhenActive="page"
            [class.nav__quiet]="l.quiet"
            (click)="open.set(false)"
            >{{ 'nav.' + l.path.slice(1) | t: undefined : l.label }}</a
          >
        }
        <span class="nav__tools">
          <span class="nav__lang" role="group" [attr.aria-label]="'nav.lang' | t">
            <button type="button" [class.on]="i18n.lang() === 'en'" [attr.aria-pressed]="i18n.lang() === 'en'" (click)="i18n.set('en')" lang="en">EN</button>
            <button type="button" [class.on]="i18n.lang() === 'es'" [attr.aria-pressed]="i18n.lang() === 'es'" (click)="i18n.set('es')" lang="es">ES</button>
          </span>
          <button type="button" class="nav__icon" (click)="theme.toggle()" [attr.aria-label]="(theme.theme() === 'dark' ? 'nav.theme.light' : 'nav.theme.dark') | t" [title]="(theme.theme() === 'dark' ? 'nav.theme.light' : 'nav.theme.dark') | t" data-testid="theme-toggle">
            @if (theme.theme() === 'dark') {
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            } @else {
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
            }
          </button>
          <button type="button" class="nav__icon nav__kbd" (click)="shortcuts.open()" [attr.aria-label]="'nav.shortcuts' | t" [title]="'nav.shortcuts' | t">?</button>
        </span>
      </nav>
    </header>
  `,
  styles: `
    .nav {
      position: sticky;
      top: 0;
      z-index: 40;
      background: var(--nav-bg);
      backdrop-filter: blur(12px) saturate(140%);
      -webkit-backdrop-filter: blur(12px) saturate(140%);
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
      background: var(--glass-hover);
      box-shadow: inset 0 0 0 1px var(--glass-border);
    }
    .nav__links a.nav__quiet {
      color: var(--text-3);
    }
    .nav__links a.nav__quiet.is-active {
      color: var(--text);
    }
    .nav__tools {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: var(--sp-2);
      padding-left: var(--sp-2);
      border-left: 1px solid var(--border-subtle);
    }
    .nav__lang {
      display: inline-flex;
      padding: 2px;
      border-radius: var(--r-pill);
      border: 1px solid var(--glass-border);
    }
    .nav__lang button,
    .nav__icon {
      border: 0;
      background: transparent;
      color: var(--text-2);
      font: inherit;
      font-size: var(--fs-xs);
      font-weight: 700;
      cursor: pointer;
    }
    .nav__lang button {
      padding: 3px 8px;
      border-radius: var(--r-pill);
    }
    .nav__lang button.on {
      background: var(--glass-hover);
      color: var(--text);
      box-shadow: inset 0 0 0 1px var(--glass-border);
    }
    .nav__icon {
      display: inline-grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }
    .nav__icon:hover,
    .nav__lang button:hover {
      color: var(--text);
      background: var(--glass-hover);
    }
    .nav__kbd {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
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
      .nav__tools {
        margin: var(--sp-2) 0 0;
        padding: var(--sp-2) 0 0;
        border-left: 0;
        border-top: 1px solid var(--border-subtle);
      }
    }
  `,
})
export class TopNav {
  readonly links = NAV_LINKS;
  readonly i18n = inject(I18n);
  readonly theme = inject(ThemeService);
  readonly shortcuts = inject(Shortcuts);
  readonly open = signal(false);

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }
}
