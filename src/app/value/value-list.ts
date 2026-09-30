import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { RevenueEvent, ValueEvent, listRevenueEvents, listValueEvents } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { confirmedLamports, lamportsToSol, paidLabel, short, statusClass, statusLabel } from './value-model';

const LIST_LIMIT = 50;

/** `/value`: the accepted outcomes recorded as ValueEvents, who contributed, and whether each is anchored on Solana. */
@Component({
  selector: 'app-value-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate, ValueNav],
  templateUrl: './value-list.html',
  styleUrl: './value.scss',
})
export class ValueList {
  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly events = signal<ValueEvent[] | null>(null);
  /** null = not read (or unreadable): the KPI says so instead of showing 0. */
  readonly revenue = signal<RevenueEvent[] | null>(null);
  readonly sol = lamportsToSol;

  readonly short = short;
  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;
  readonly paidLabel = paidLabel;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.load();
    const timer = setInterval(() => {
      if (this.signedIn()) void this.load(false);
    }, 10000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** Header numbers (Control Tower style). Distributed SOL = confirmed immediate rewards + confirmed revenue payouts. */
  kpis(): { accepted: number; anchored: number; distributedLamports: number | null; revenueEvents: number | null } | null {
    const list = this.events();
    if (!list) return null;
    const rev = this.revenue();
    const immediate = list.reduce((a, e) => a + (e.distribution?.confirmedLamports ?? 0), 0);
    return {
      accepted: list.length,
      anchored: list.filter((e) => e.status === 'ANCHORED').length,
      distributedLamports: rev ? immediate + rev.reduce((a, r) => a + confirmedLamports(r.payouts), 0) : null,
      revenueEvents: rev ? rev.length : null,
    };
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.load();
  }

  async load(showLoading = true): Promise<void> {
    if (showLoading) this.loading.set(true);
    try {
      this.events.set(await listValueEvents(LIST_LIMIT));
      this.error.set(null);
      // Revenue is optional for this page: an older backend has no /revenue-events and the events must still render.
      listRevenueEvents().then((r) => this.revenue.set(r)).catch(() => this.revenue.set(null));
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`Could not read value events: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
