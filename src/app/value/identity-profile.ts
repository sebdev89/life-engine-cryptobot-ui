import { Component, effect, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { IdentityProfile as Profile, getIdentity } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { explorerAddressUrl, lamportsToSol, statusClass } from './value-model';

/** `/value/identities/:id` (KAN-830): kind, wallet, owner/operator, explicit reputation and the history behind it. */
@Component({
  selector: 'app-identity-profile',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate, ValueNav],
  templateUrl: './identity-profile.html',
  styleUrl: './value.scss',
})
export class IdentityProfilePage {
  readonly id = input<string | undefined>();

  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly explorerAddressUrl = explorerAddressUrl;
  readonly sol = lamportsToSol;
  readonly anchorClass = (s: string) => statusClass(s === 'ANCHORED' ? 'ANCHORED' : 'RECORDED');

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    effect(() => {
      const id = this.id();
      const signed = this.signedIn();
      untracked(() => {
        if (signed && id) void this.load(id);
      });
    });
  }

  onSignedIn(): void {
    this.signedIn.set(true);
  }

  async load(id: string): Promise<void> {
    this.profile.set(null);
    try {
      this.profile.set(await getIdentity(id));
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
        return;
      }
      const status = (e as { apiError?: { status?: number } })?.apiError?.status;
      this.error.set(status === 404 ? 'No identity with this id.' : `API: ${(e as Error)?.message ?? e}`);
    }
  }
}
