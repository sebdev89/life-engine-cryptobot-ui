import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { RevenueEvent, getRevenueEvent } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { PayoutsTable } from './payouts-table';
import { FlowPart, MoneyFlow } from './money-flow';
import { ExtIcon, HashChip } from '../ui/hash';
import { TruthChip } from '../ui/truth';
import { When } from '../ui/when';
import { slotLabel } from '../ui/format';
import { DISTRIBUTION_NOTE, REVENUE_SIMULATED_NOTE, bpsPercent, lamportsToSol, revenuePolicyView, revenueStatusClass } from './value-model';

/** `/value/revenue/:id`: what value came in, why it was split this way, who was paid, and the Solana anchor. */
@Component({
  selector: 'app-revenue-detail',
  standalone: true,
  imports: [RouterLink, TopNav, TokenGate, ValueNav, PayoutsTable, MoneyFlow, HashChip, ExtIcon, TruthChip, When],
  templateUrl: './revenue-detail.html',
  styleUrl: './value.scss',
})
export class RevenueDetail {
  readonly id = input<string | undefined>();

  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly event = signal<RevenueEvent | null>(null);
  readonly policy = computed(() => {
    const ev = this.event();
    return ev ? revenuePolicyView(ev) : null;
  });

  /** the three parts of the policy split, with the server's amounts */
  readonly flowParts = computed<FlowPart[]>(() => {
    const ev = this.event();
    const p = this.policy();
    if (!ev || !p) return [];
    return [
      { label: 'Contributors', lamports: ev.contributorPoolLamports, bps: p.shareBps, pool: true, tone: 'pool' },
      { label: 'Protocol fee', lamports: ev.protocolFeeLamports, bps: p.feeBps, tone: 'fee' },
      { label: 'Retained', lamports: ev.retainedLamports, bps: p.retainedBps, tone: 'retained' },
    ];
  });
  readonly slotLabel = slotLabel;

  readonly note = DISTRIBUTION_NOTE;
  readonly simulatedNote = REVENUE_SIMULATED_NOTE;
  readonly sol = lamportsToSol;
  readonly pct = bpsPercent;
  readonly statusClass = revenueStatusClass;

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
    try {
      this.event.set(await getRevenueEvent(id));
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
        return;
      }
      const status = (e as { apiError?: { status?: number } })?.apiError?.status;
      this.error.set(status === 404 ? 'No revenue event with this id.' : `API: ${(e as Error)?.message ?? e}`);
    }
  }
}
