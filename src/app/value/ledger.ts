import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { LedgerGroupBy, UnitsLedger, getUnitsLedger } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { LEDGER_GROUPS, UNITS_DISCLAIMER } from './value-model';

/** `/value/ledger`: Contribution Units accumulated, grouped by identity, asset or project. */
@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [RouterLink, TopNav, TokenGate, ValueNav],
  templateUrl: './ledger.html',
  styleUrl: './value.scss',
})
export class Ledger {
  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ledger = signal<UnitsLedger | null>(null);
  readonly groupBy = signal<LedgerGroupBy>('identity');
  readonly groups = LEDGER_GROUPS;
  readonly disclaimer = UNITS_DISCLAIMER;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.load();
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.load();
  }

  select(g: LedgerGroupBy): void {
    this.groupBy.set(g);
    void this.load();
  }

  async load(): Promise<void> {
    const g = this.groupBy();
    this.loading.set(true);
    this.ledger.set(null);
    try {
      const l = await getUnitsLedger(g);
      if (this.groupBy() === g) this.ledger.set(l);
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`Could not read the ledger: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
