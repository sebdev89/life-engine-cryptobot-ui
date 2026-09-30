import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Sub-navigation inside the Value section: Events · Identities · Ledger · Revenue · Treasury. */
@Component({
  selector: 'app-value-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="subnav" aria-label="Proof of Value sections">
      <a routerLink="/value" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Events</a>
      <a routerLink="/value/identities" routerLinkActive="on">Identities</a>
      <a routerLink="/value/ledger" routerLinkActive="on">Ledger</a>
      <a routerLink="/value/revenue" routerLinkActive="on">Revenue</a>
      <a routerLink="/value/treasury" routerLinkActive="on">Treasury</a>
    </nav>
  `,
  styleUrl: './value.scss',
})
export class ValueNav {}
