import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { RevenueEvent, listRevenueEvents } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { DISTRIBUTION_NOTE, REVENUE_SIMULATED_NOTE, lamportsToSol, revenueStatusClass } from './value-model';

/** `/value/revenue` (KAN-832): revenue events, newest first, with the split the server computed. */
@Component({
  selector: 'app-revenue-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate, ValueNav],
  templateUrl: './revenue-list.html',
  styleUrl: './value.scss',
})
export class RevenueList {
  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly events = signal<RevenueEvent[] | null>(null);
  readonly note = DISTRIBUTION_NOTE;
  readonly simulatedNote = REVENUE_SIMULATED_NOTE;
  readonly sol = lamportsToSol;
  readonly statusClass = revenueStatusClass;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.load();
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.load();
  }

  hasSimulated(): boolean {
    return !!this.events()?.some((e) => e.simulated);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.events.set(await listRevenueEvents());
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`Could not read revenue events: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
