import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The one header every screen shares (KAN-787 → KAN-789): brand, then the route a judge walks —
 * Control Tower → execution detail → proof → Demo Mode — and the operator console at the end.
 */
@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <a routerLink="/" class="nav__brand" aria-label="CryptoBot home">
        <img class="nav__mark" src="/brand/cryptobot-mark.svg" alt="" width="22" height="22" />
        <span>CryptoBot</span>
        <span class="nav__tag">trusted agent execution</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a routerLink="/tower" routerLinkActive="is-active">Control Tower</a>
        <a routerLink="/live" routerLinkActive="is-active">Execution</a>
        <a routerLink="/proof" routerLinkActive="is-active">Proof</a>
        <a routerLink="/recovery" routerLinkActive="is-active">Recovery</a>
        <a routerLink="/demo" routerLinkActive="is-active">Demo Mode</a>
        <a routerLink="/console" routerLinkActive="is-active" class="nav__quiet">Console</a>
      </nav>
    </header>
  `,
  styles: `
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-4);
      flex-wrap: wrap;
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
      flex-wrap: wrap;
    }
    .nav__links a {
      padding: var(--sp-1) var(--sp-3);
      border-radius: var(--r-pill);
      color: var(--text-2);
      font-size: var(--fs-sm);
      text-decoration: none;
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
  `,
})
export class TopNav {}
