import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ActionProposal, getProposal, listAllProposals } from '../control-plane-api';
import { AuthRequiredError } from '../cryptobot-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import {
  CORE_RULES,
  PRICE_RULES,
  RuleState,
  SIGNER_RULES,
  TIERS,
  assetsTouched,
  buildRules,
  countStates,
  inputFacts,
  pickProposal,
  predicateRows,
  ruleState,
  timelockRow,
  timelockSeconds,
} from './policies-model';

const LIST_LIMIT = 50;

/**
 * `/policies`: the policy a proposal was decided under — verdict, R_v / H_R, the 13 core
 * rules with their state, price integrity, signer caps, predicates, tiers, allowlist and timelock —
 * read from `GET /proposals/{id}`. `?proposal=<id>` picks one; default is the newest with a record.
 */
@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [RouterLink, DatePipe, TopNav, TokenGate],
  templateUrl: './policies.html',
  styleUrl: './policies.scss',
})
export class PoliciesView {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly signedIn = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly list = signal<ActionProposal[] | null>(null);
  readonly current = signal<ActionProposal | null>(null);
  readonly now = signal(Date.now());

  readonly tiers = TIERS;

  readonly core = computed(() => {
    const p = this.current();
    return p ? buildRules(CORE_RULES, p, this.now()) : [];
  });
  readonly price = computed(() => {
    const p = this.current();
    return p ? buildRules(PRICE_RULES, p, this.now()) : [];
  });
  readonly signer = computed(() => {
    const p = this.current();
    return p ? buildRules(SIGNER_RULES, p, this.now()) : [];
  });
  readonly coreCounts = computed(() => countStates(this.core()));
  readonly verdict = computed(() => this.current()?.policy?.authorization ?? null);
  readonly predicates = computed(() => predicateRows(this.verdict()));
  readonly assets = computed(() => {
    const p = this.current();
    if (!p) return [];
    const oracle = p.policy?.oracle?.assets ?? [];
    return assetsTouched(p).map((a) => {
      const o = oracle.find((x) => x.asset === a);
      return { asset: a, price: o?.priceUsd ?? null, sources: o ? o.used.map((u) => u.source) : [], mint: o?.mint ?? null };
    });
  });
  readonly allowlist = computed(() => ruleState(this.current()?.policy, 'ASSET_ALLOWLIST'));
  readonly timelock = computed(() => {
    const p = this.current();
    return p ? { ...timelockRow(p, this.now()), seconds: timelockSeconds(p) } : null;
  });
  readonly facts = computed(() => inputFacts(this.current()?.policy?.input));
  readonly tradeCents = computed(() => this.facts().find((f) => f.group === 'intent' && f.key === 'tradeValueCents')?.value ?? null);
  readonly limits = computed(() => this.current()?.policy?.oracle?.limits ?? null);

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    if (this.signedIn()) void this.load(this.route.snapshot.queryParamMap.get('proposal'));
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    this.error.set(null);
    void this.load(null);
  }

  onPick(e: Event): void {
    const id = (e.target as HTMLSelectElement).value;
    void this.router.navigate([], { queryParams: { proposal: id }, replaceUrl: true });
    void this.load(id);
  }

  async load(wanted: string | null): Promise<void> {
    this.loading.set(true);
    try {
      const list = await listAllProposals(LIST_LIMIT);
      this.list.set(list);
      const pick = pickProposal(list, wanted);
      if (pick) {
        const { proposal } = await getProposal(pick.id);
        this.current.set(proposal);
      } else {
        this.current.set(null);
      }
      this.now.set(Date.now());
      this.error.set(null);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        this.signedIn.set(false);
        this.error.set('The token was rejected or expired.');
      } else {
        this.error.set(`API not reachable: ${(e as Error)?.message ?? e}`);
      }
    } finally {
      this.loading.set(false);
    }
  }

  stateClass(s: RuleState): string {
    return s === 'PASS' ? 'done' : s === 'FAIL' ? 'failed' : s === 'PENDING' ? 'active' : 'pending';
  }

  stateLabel(s: RuleState): string {
    return s === 'NOT_EVALUATED' ? 'not evaluated' : s.toLowerCase();
  }

  decisionClass(d: string | undefined): string {
    return d === 'ALLOW' ? 'ok' : d === 'DENY' ? 'err' : 'warn';
  }

  label(p: ActionProposal): string {
    const t = new Date(p.createdAt);
    const hhmm = Number.isFinite(t.getTime()) ? t.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `${p.id.slice(0, 8)} · ${p.status} · ${p.policy?.authorization?.decision ?? 'no verdict'} · ${hhmm}`;
  }
}
