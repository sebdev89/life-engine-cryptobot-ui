import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loginWithPassword } from '../auth-api';
import { uiConfig } from '../config';
import {
  ActionProposal,
  ActivityItem,
  AuditEvent,
  MessageView,
  PortfolioResponse,
  Position,
  SuggestedAction,
  WalletView,
  askAdvisor,
  createRebalance,
  decideProposal,
  executeProposal,
  getActivity,
  getPortfolio,
  getProposal,
  listMessages,
  listProposals,
  listWallets,
  refreshPortfolio,
  registerWallet,
} from '../control-plane-api';
import { AuthRequiredError, runtimeSseUrl } from '../cryptobot-api';
import { clearCryptobotSession, getAccessToken, setCryptobotSession } from '../session';
import { Glossary } from '../glossary/glossary';
import { Lineage } from '../lineage/lineage';
import { Receipts } from '../receipts/receipts';
import { TopNav } from '../shell/top-nav';

interface RuntimeEventFrame {
  type: string;
  stageId?: string | null;
  timestamp?: string;
  terminal?: boolean;
  payload?: Record<string, string>;
}

/** Chat turn as rendered; assistant turns carry the structured suggestions for one-click simulate. */
interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  actions: SuggestedAction[];
  runtimeRunId: string | null;
  model?: string | null;
  confidence?: number | null;
}

const QUICK_PROMPTS = [
  '¿Qué cambió en mi wallet?',
  '¿Cuál es mi mayor riesgo?',
  '¿Qué pasa si vendo 20% de SOL?',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, SlicePipe, RouterLink, Glossary, Lineage, Receipts, TopNav],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  readonly config = uiConfig();
  readonly quickPrompts = QUICK_PROMPTS;

  // ---- glossary (drawer, available before and after login) ----
  readonly glossaryOpen = signal(false);

  // ---- auth ----
  readonly authed = signal<boolean>(!!getAccessToken());
  readonly email = signal('');
  readonly password = signal('');
  readonly loginBusy = signal(false);
  readonly loginError = signal<string | null>(null);

  // ---- wallets ----
  readonly wallets = signal<WalletView[]>([]);
  readonly addressInput = signal(this.config.demoWallet ?? '');
  readonly clusterInput = signal(this.config.demoCluster ?? 'devnet');
  readonly walletBusy = signal(false);
  readonly walletError = signal<string | null>(null);

  // ---- portfolio ----
  readonly portfolio = signal<PortfolioResponse | null>(null);
  readonly activity = signal<ActivityItem[]>([]);
  readonly refreshing = signal(false);

  // ---- advisor ----
  readonly chat = signal<ChatTurn[]>([]);
  readonly question = signal('');
  readonly asking = signal(false);
  readonly askError = signal<string | null>(null);
  readonly events = signal<RuntimeEventFrame[]>([]);
  readonly sseStatus = signal<'idle' | 'connecting' | 'live' | 'closed' | 'error'>('idle');

  // ---- proposals ----
  readonly proposals = signal<ActionProposal[]>([]);
  readonly selected = signal<ActionProposal | null>(null);
  readonly audit = signal<AuditEvent[]>([]);
  readonly targetSol = signal<number>(50);
  readonly proposalBusy = signal(false);
  readonly proposalError = signal<string | null>(null);
  readonly showLogs = signal(false);
  readonly showTx = signal(false);
  /** Bumped whenever the selected proposal changes state, so the lineage panel reloads its DAG (KAN-393). */
  readonly lineageVersion = signal(0);
  /** Bumped after approve / execute / refresh so the receipts panel (KAN-394) reloads. */
  readonly receiptsVersion = signal(0);

  readonly wallet = computed(() => this.portfolio()?.wallet ?? null);
  readonly pricedPositions = computed(() =>
    (this.portfolio()?.snapshot.positions ?? []).filter((p) => p.priceUsd !== null).slice(0, 8),
  );
  readonly unpricedCount = computed(
    () => (this.portfolio()?.snapshot.positions ?? []).filter((p) => p.priceUsd === null).length,
  );
  readonly solWeight = computed(() => {
    const sol = this.portfolio()?.snapshot.positions.find((p) => p.symbol === 'SOL');
    return sol?.weightPct ?? null;
  });

  private es: EventSource | null = null;

  ngOnInit(): void {
    if (this.authed()) {
      void this.loadWallets();
    }
  }

  ngOnDestroy(): void {
    this.closeSse();
  }

  // ---- auth --------------------------------------------------------------------------------

  onEmailChange(v: string): void {
    this.email.set(v);
  }

  onPasswordChange(v: string): void {
    this.password.set(v);
  }

  async onLogin(): Promise<void> {
    if (this.loginBusy()) return;
    this.loginBusy.set(true);
    this.loginError.set(null);
    try {
      setCryptobotSession(await loginWithPassword(this.email().trim(), this.password()));
      this.authed.set(true);
      this.password.set(''); // never keep the plaintext password resident
      await this.loadWallets();
    } catch (e) {
      const err = e as Error & { loginError?: { message: string } };
      this.loginError.set(err.loginError?.message ?? err.message ?? 'Login failed');
    } finally {
      this.loginBusy.set(false);
    }
  }

  onLogout(): void {
    clearCryptobotSession();
    this.closeSse();
    this.authed.set(false);
    this.portfolio.set(null);
    this.wallets.set([]);
    this.proposals.set([]);
    this.selected.set(null);
    this.chat.set([]);
  }

  // ---- wallets -----------------------------------------------------------------------------

  async loadWallets(): Promise<void> {
    try {
      const ws = await listWallets();
      this.wallets.set(ws);
      if (ws.length && !this.portfolio()) {
        // Deep link for demos: ?wallet=<id> opens straight on that wallet.
        const wanted = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('wallet') : null;
        await this.selectWallet(ws.find((w) => w.id === wanted) ?? ws[0]);
      }
    } catch (e) {
      this.handleAuth(e);
    }
  }

  async onTrackWallet(): Promise<void> {
    const address = this.addressInput().trim();
    if (!address) {
      return;
    }
    this.walletBusy.set(true);
    this.walletError.set(null);
    try {
      const view = await registerWallet(address, this.clusterInput());
      this.portfolio.set(view);
      this.wallets.set(await listWallets().catch(() => this.wallets()));
      await this.afterWalletSelected(view.wallet.id);
    } catch (e) {
      this.walletError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.walletBusy.set(false);
    }
  }

  async selectWallet(w: WalletView): Promise<void> {
    this.walletError.set(null);
    try {
      this.portfolio.set(await getPortfolio(w.id));
      await this.afterWalletSelected(w.id);
    } catch (e) {
      this.walletError.set(this.message(e));
      this.handleAuth(e);
    }
  }

  private async afterWalletSelected(walletId: string): Promise<void> {
    this.selected.set(null);
    this.audit.set([]);
    this.chat.set([]);
    this.events.set([]);
    const [acts, msgs, props] = await Promise.all([
      getActivity(walletId).catch(() => [] as ActivityItem[]),
      listMessages(walletId).catch(() => [] as MessageView[]),
      listProposals(walletId).catch(() => [] as ActionProposal[]),
    ]);
    this.activity.set(acts);
    this.chat.set(msgs.map((m) => this.turnFromMessage(m)));
    this.proposals.set(props);
    if (props.length) {
      await this.selectProposal(props[0]);
    }
  }

  async onRefresh(): Promise<void> {
    const w = this.wallet();
    if (!w) {
      return;
    }
    this.refreshing.set(true);
    try {
      this.portfolio.set(await refreshPortfolio(w.id));
      this.activity.set(await getActivity(w.id).catch(() => []));
    } catch (e) {
      this.walletError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.refreshing.set(false);
      this.receiptsVersion.update((v) => v + 1);
    }
  }

  // ---- advisor -----------------------------------------------------------------------------

  async onAsk(text?: string): Promise<void> {
    const w = this.wallet();
    const q = (text ?? this.question()).trim();
    if (!w || !q || this.asking()) {
      return;
    }
    this.asking.set(true);
    this.askError.set(null);
    this.question.set('');
    this.chat.update((c) => [...c, { role: 'user', content: q, actions: [], runtimeRunId: null }]);
    this.events.set([]);
    try {
      const res = await askAdvisor(w.id, q, this.selected()?.id ?? null);
      this.chat.update((c) => [
        ...c,
        {
          role: 'assistant',
          content: res.answer.answer,
          actions: res.answer.suggestedActions,
          runtimeRunId: res.runtimeRunId,
          model: res.answer.model,
          confidence: res.answer.confidence,
        },
      ]);
      this.openSse(runtimeSseUrl({ runtimeBaseUrl: res.runtimeBaseUrl, ssePath: res.ssePath }));
    } catch (e) {
      this.askError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.asking.set(false);
    }
  }

  // ---- proposals ---------------------------------------------------------------------------

  async onSimulate(action?: SuggestedAction, runtimeRunId?: string | null): Promise<void> {
    const w = this.wallet();
    if (!w) {
      return;
    }
    const asset = action?.asset ?? 'SOL';
    const target = action?.targetWeightPct ?? this.targetSol();
    this.proposalBusy.set(true);
    this.proposalError.set(null);
    try {
      const created = await createRebalance(
        w.id,
        { [asset]: target },
        action ? `advisor: ${action.rationale}` : `operator asked for ${asset} at ${target}%`,
        runtimeRunId ?? null,
      );
      this.proposals.update((p) => [created.proposal, ...p]);
      await this.selectProposal(created.proposal);
    } catch (e) {
      this.proposalError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.proposalBusy.set(false);
    }
  }

  async selectProposal(p: ActionProposal): Promise<void> {
    this.selected.set(p);
    this.showLogs.set(false);
    this.showTx.set(false);
    try {
      const full = await getProposal(p.id);
      this.selected.set(full.proposal);
      this.audit.set(full.audit);
    } catch (e) {
      this.handleAuth(e);
    }
  }

  async onDecide(decision: 'approve' | 'reject'): Promise<void> {
    const p = this.selected();
    if (!p) {
      return;
    }
    this.proposalBusy.set(true);
    this.proposalError.set(null);
    try {
      const updated = await decideProposal(
        p.id,
        decision,
        decision === 'approve' ? 'Approved from CryptoBot UI' : 'Rejected from CryptoBot UI',
      );
      await this.replaceProposal(updated);
    } catch (e) {
      this.proposalError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.proposalBusy.set(false);
    }
  }

  async onExecute(): Promise<void> {
    const p = this.selected();
    if (!p) {
      return;
    }
    this.proposalBusy.set(true);
    this.proposalError.set(null);
    try {
      const updated = await executeProposal(p.id);
      await this.replaceProposal(updated);
      await this.onRefresh();
    } catch (e) {
      this.proposalError.set(this.message(e));
      this.handleAuth(e);
    } finally {
      this.proposalBusy.set(false);
    }
  }

  private async replaceProposal(updated: ActionProposal): Promise<void> {
    this.proposals.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    await this.selectProposal(updated);
    this.lineageVersion.update((v) => v + 1);
    this.receiptsVersion.update((v) => v + 1);
  }

  // ---- helpers -----------------------------------------------------------------------------

  weightsAfterEntries(p: ActionProposal): { symbol: string; before: number; after: number }[] {
    const keys = new Set([...Object.keys(p.plan.weightsBefore), ...Object.keys(p.plan.weightsAfter)]);
    return [...keys]
      .map((symbol) => ({
        symbol,
        before: p.plan.weightsBefore[symbol] ?? 0,
        after: p.plan.weightsAfter[symbol] ?? 0,
      }))
      .filter((e) => Math.abs(e.before - e.after) > 0.01)
      .sort((a, b) => b.before - a.before);
  }

  canApprove(p: ActionProposal | null): boolean {
    return !!p && p.status === 'AWAITING_APPROVAL';
  }

  canExecute(p: ActionProposal | null): boolean {
    return !!p && p.status === 'APPROVED' && !!p.policy?.executable;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'EXECUTED':
      case 'APPROVED':
        return 'ok';
      case 'AWAITING_APPROVAL':
      case 'EXECUTING':
        return 'warn';
      case 'BLOCKED_BY_POLICY':
      case 'REJECTED':
      case 'FAILED':
      case 'EXPIRED':
        return 'err';
      default:
        return '';
    }
  }

  severityClass(sev: string): string {
    return sev === 'HIGH' ? 'err' : sev === 'MEDIUM' ? 'warn' : 'ok';
  }

  barColor(p: Position, i: number): string {
    if (p.stable) {
      return '#4ade80';
    }
    const palette = ['#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#2dd4bf', '#94a3b8'];
    return palette[i % palette.length];
  }

  fmtUsd(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return '—';
    }
    return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }

  fmtPct(v: number | null | undefined, digits = 1): string {
    return v === null || v === undefined ? '—' : `${v.toFixed(digits)}%`;
  }

  fmtAmount(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return '—';
    }
    return v >= 1 ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : v.toPrecision(3);
  }

  fmtLamports(l: number | null | undefined): string {
    return l === null || l === undefined ? '—' : `${(l / 1_000_000_000).toFixed(4)} SOL`;
  }

  shortSig(s: string | null): string {
    return s ? `${s.slice(0, 8)}…${s.slice(-6)}` : '—';
  }

  eventLabel(e: RuntimeEventFrame): string {
    return e.type + (e.stageId ? ` · ${e.stageId}` : '');
  }

  private turnFromMessage(m: MessageView): ChatTurn {
    const structured = m.structured as { suggestedActions?: SuggestedAction[]; model?: string; confidence?: number };
    return {
      role: m.role,
      content: m.content,
      actions: structured?.suggestedActions ?? [],
      runtimeRunId: m.runtimeRunId,
      model: structured?.model ?? null,
      confidence: structured?.confidence ?? null,
    };
  }

  private openSse(url: string): void {
    this.closeSse();
    this.sseStatus.set('connecting');
    try {
      const es = new EventSource(url);
      this.es = es;
      es.onopen = () => this.sseStatus.set('live');
      es.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data) as RuntimeEventFrame;
          this.events.update((list) => [...list.slice(-40), frame]);
          if (frame.terminal) {
            this.sseStatus.set('closed');
            this.closeSse();
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        this.sseStatus.set(this.events().length ? 'closed' : 'error');
        this.closeSse();
      };
    } catch {
      this.sseStatus.set('error');
    }
  }

  private closeSse(): void {
    this.es?.close();
    this.es = null;
  }

  private message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  private handleAuth(e: unknown): void {
    if (e instanceof AuthRequiredError) {
      this.onLogout();
    }
  }
}
