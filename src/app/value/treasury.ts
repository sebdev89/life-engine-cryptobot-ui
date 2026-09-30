import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { Identity, Treasury, getTreasury, listIdentities } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { TREASURY_NOTE, explorerAddressUrl, formatMicroUsd, lamportsToSol, short, shortWallet, treasuryPolicyRows, txExplorerUrl } from './value-model';

export const DEFAULT_TREASURY_IDENTITY = 'cryptobot-001';

/** `/value/treasury`: an accounting view of one AGENT identity; default `cryptobot-001`. */
@Component({
  selector: 'app-treasury',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate, ValueNav],
  templateUrl: './treasury.html',
  styleUrl: './value.scss',
})
export class TreasuryPage {
  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly treasury = signal<Treasury | null>(null);
  readonly agents = signal<Identity[]>([]);
  readonly identityId = signal(DEFAULT_TREASURY_IDENTITY);

  readonly treasuryNote = TREASURY_NOTE;
  readonly sol = lamportsToSol;
  readonly short = short;
  readonly shortWallet = shortWallet;
  readonly formatMicroUsd = formatMicroUsd;
  readonly explorerAddressUrl = explorerAddressUrl;
  readonly txExplorerUrl = txExplorerUrl;
  readonly policyRows = treasuryPolicyRows;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.start();
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.start();
  }

  async start(): Promise<void> {
    // The selector is a convenience: if the identity list cannot be read, the default treasury still loads.
    listIdentities()
      .then((all) => {
        const agents = all.filter((i) => i.kind === 'AGENT');
        this.agents.set(agents);
      })
      .catch(() => this.agents.set([]));
    await this.load();
  }

  select(id: string): void {
    this.identityId.set(id);
    void this.load();
  }

  async load(): Promise<void> {
    const id = this.identityId();
    this.loading.set(true);
    this.treasury.set(null);
    try {
      const t = await getTreasury(id);
      if (this.identityId() === id) this.treasury.set(t);
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        const status = (e as { apiError?: { status?: number } })?.apiError?.status;
        this.error.set(status === 404 ? `No treasury for ${id}.` : `Could not read the treasury: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
