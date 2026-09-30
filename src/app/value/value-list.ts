import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { ValueEvent, listValueEvents } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { paidLabel, short, statusClass, statusLabel } from './value-model';

const LIST_LIMIT = 50;

/** `/value` (KAN-828): the accepted outcomes recorded as ValueEvents, who contributed, and whether each is anchored on Solana. */
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

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.load();
  }

  async load(showLoading = true): Promise<void> {
    if (showLoading) this.loading.set(true);
    try {
      this.events.set(await listValueEvents(LIST_LIMIT));
      this.error.set(null);
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
