import { PUBLIC_DEMO } from '../public-demo/flag';
import { Component, effect, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthRequiredError } from '../cryptobot-api';
import { Distribution, ValueEvent, ValueProof, distributeValueEvent, getDistribution, getValueEvent, getValueProof } from '../value-events-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { ValueNav } from './value-nav';
import { PayoutsTable } from './payouts-table';
import { browserProofCheck, BrowserProofCheck } from './browser-proof';
import { ChainVerify } from './chain-verify';
import { MerkleViz } from './merkle-viz';
import { MoneyFlow } from './money-flow';
import { CountUp } from '../ui/count-up';
import { ExtIcon, HashChip } from '../ui/hash';
import { TruthChip } from '../ui/truth';
import { When } from '../ui/when';
import { slotLabel } from '../ui/format';
import { DISTRIBUTION_NOTE, acceptanceStages, explorerAddressUrl, formatMicroUsd, lamportsToSol, payoutClass, short, shortWallet, statusClass, statusLabel, txExplorerUrl } from './value-model';

/** `/value/:id`: one ValueEvent, section by section, with what V1 does not cover said plainly. */
@Component({
  selector: 'app-value-detail',
  standalone: true,
  imports: [RouterLink, TopNav, TokenGate, ValueNav, PayoutsTable, ChainVerify, MerkleViz, MoneyFlow, CountUp, ExtIcon, HashChip, TruthChip, When],
  templateUrl: './value-detail.html',
  styleUrl: './value.scss',
})
export class ValueDetail {
  readonly id = input<string | undefined>();

  readonly publicDemo = PUBLIC_DEMO;
  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly event = signal<ValueEvent | null>(null);
  readonly proof = signal<ValueProof | null>(null);
  readonly proofError = signal<string | null>(null);
  /** the same Merkle fold as the service, done here with WebCrypto: the page does not just repeat a boolean */
  readonly browserCheck = signal<BrowserProofCheck | null>(null);

  readonly distribution = signal<Distribution | null>(null);
  readonly distributing = signal(false);
  readonly distributeError = signal<string | null>(null);
  readonly distributionError = signal<string | null>(null);

  readonly note = DISTRIBUTION_NOTE;
  readonly sol = lamportsToSol;
  readonly payoutClass = payoutClass;
  readonly shortWallet = shortWallet;
  readonly explorerAddressUrl = explorerAddressUrl;
  readonly txExplorerUrl = txExplorerUrl;
  readonly paidCount = (d: Distribution) => d.payouts.filter((p) => p.status === 'CONFIRMED').length;
  readonly short = short;
  readonly formatMicroUsd = formatMicroUsd;
  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;
  readonly stages = acceptanceStages;
  readonly slotLabel = slotLabel;
  /** SOL actually confirmed on chain, as a number for the counter */
  readonly confirmedSol = (d: Distribution) => d.payouts.filter((p) => p.status === 'CONFIRMED').reduce((a, p) => a + p.lamports, 0) / 1_000_000_000;
  /** `github.com/owner/repo/pull/59` → `owner/repo #59` */
  readonly prLabel = (url: string) => {
    const m = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(url);
    return m ? `${m[1]} #${m[2]}` : url;
  };
  /** the Merkle path of the proof response, when it carries one */
  readonly proofSteps = (p: ValueProof): readonly string[] | null => {
    const path = (p['anchor'] as { proof?: unknown } | undefined)?.proof;
    return Array.isArray(path) && path.every((x) => typeof x === 'string') ? (path as string[]) : null;
  };
  /** the live check only exists for devnet anchors (the only cluster this demo writes to) */
  readonly onDevnet = (explorerUrl: string | null | undefined) => !!explorerUrl && /[?&]cluster=devnet\b/.test(explorerUrl);

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
    this.browserCheck.set(null);
    this.distribution.set(null);
    this.distributeError.set(null);
    this.distributionError.set(null);
    try {
      const ev = await getValueEvent(id);
      this.event.set(ev);
      this.error.set(null);
      if (ev.distribution) {
        getDistribution(id)
          .then((d) => this.distribution.set(d))
          .catch((e) => this.distributionError.set((e as Error)?.message ?? String(e)));
      }
      // Only an anchored event has a proof worth asking for; a recorded one says so instead of erroring.
      if (ev.status === 'ANCHORED') {
        getValueProof(id)
          .then(async (p) => {
            this.proof.set(p);
            this.browserCheck.set(await browserProofCheck(p, ev.anchor?.root ?? null));
          })
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

  /** The distribute call needs RUNTIME_ADMIN; the UI does not know roles, so a 403 is reported as what it is. */
  async distribute(): Promise<void> {
    const ev = this.event();
    if (!ev || ev.status !== 'ANCHORED' || this.distributing()) return;
    this.distributing.set(true);
    this.distributeError.set(null);
    try {
      const d = await distributeValueEvent(ev.id);
      this.distribution.set(d);
      this.event.set({ ...ev, distribution: { status: d.status, poolLamports: d.poolLamports, confirmedLamports: d.payouts.filter((p) => p.status === 'CONFIRMED').reduce((a, p) => a + p.lamports, 0) } });
    } catch (e) {
      const status = (e as { apiError?: { status?: number } })?.apiError?.status;
      if (e instanceof AuthRequiredError) {
        this.distributeError.set('The token was rejected or expired.');
      } else if (status === 403) {
        this.distributeError.set('This token is not allowed to distribute rewards (RUNTIME_ADMIN required).');
      } else if (status === 409) {
        this.distributeError.set('The value event is not anchored on Solana yet; distribute after it is anchored.');
      } else {
        this.distributeError.set(`Distribution failed: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.distributing.set(false);
    }
  }
}
