import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { Identity, listIdentities } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { short } from './value-model';

/** `/value/identities` (KAN-830): every identity with its explicit reputation. */
@Component({
  selector: 'app-identity-list',
  standalone: true,
  imports: [RouterLink, TopNav, TokenGate, ValueNav],
  templateUrl: './identity-list.html',
  styleUrl: './value.scss',
})
export class IdentityList {
  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly identities = signal<Identity[] | null>(null);
  readonly short = short;

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.load();
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.identities.set(await listIdentities());
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`Could not read identities: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
