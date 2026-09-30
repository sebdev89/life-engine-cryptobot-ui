import { Component, effect, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { ValueEvent, ValueProof, getValueEvent, getValueProof } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { acceptanceStages, short, statusClass, statusLabel } from './value-model';

/** `/value/:id` (KAN-828): one ValueEvent, section by section, with what V1 does not cover said plainly. */
@Component({
  selector: 'app-value-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate],
  templateUrl: './value-detail.html',
  styleUrl: './value.scss',
})
export class ValueDetail {
  readonly id = input<string | undefined>();

  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly event = signal<ValueEvent | null>(null);
  readonly proof = signal<ValueProof | null>(null);
  readonly proofError = signal<string | null>(null);

  readonly short = short;
  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;
  readonly stages = acceptanceStages;

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
    this.event.set(null);
    this.proof.set(null);
    this.proofError.set(null);
    try {
      const ev = await getValueEvent(id);
      this.event.set(ev);
      this.error.set(null);
      // Only an anchored event has a proof worth asking for; a recorded one says so instead of erroring.
      if (ev.status === 'ANCHORED') {
        getValueProof(id)
          .then((p) => this.proof.set(p))
          .catch((e) => this.proofError.set((e as Error)?.message ?? String(e)));
      }
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
        return;
      }
      const status = (e as { apiError?: { status?: number } })?.apiError?.status;
      this.error.set(status === 404 ? 'No value event with this id.' : `API: ${(e as Error)?.message ?? e}`);
    }
  }
}
