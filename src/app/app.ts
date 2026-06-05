import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { loginWithPassword } from './auth-api';
import {
  ApiErrorBody,
  AuthRequiredError,
  CRYPTOBOT_API_BASE,
  MarketReviewResponse,
  MarketReviewSummary,
  MarketSnapshotDto,
  MonitoringRunOnceResponse,
  getLatestReviews,
  getMarketSnapshot,
  listIndicators,
  listWatchlist,
  postMarketReview,
  runtimeSseUrl,
  triggerMonitoringRunOnce,
} from './cryptobot-api';
import { clearCryptobotSession, getAccessToken, setCryptobotSession } from './session';

interface RuntimeEventFrame {
  type: string;
  stageId?: string | null;
  timestamp?: string;
  terminal?: boolean;
  payload?: Record<string, string>;
}

interface ProbeState {
  status: 'idle' | 'loading' | 'ok' | 'err';
  detail: string;
}

const EMPTY_PROBE: ProbeState = { status: 'idle', detail: '' };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  readonly cryptobotApiBase = CRYPTOBOT_API_BASE;

  // ---- auth state ----
  readonly authed = signal<boolean>(!!getAccessToken());
  readonly email = signal('admin@life-engine.local');
  readonly password = signal('admin123456');
  readonly loginBusy = signal(false);
  readonly loginError = signal<string | null>(null);

  // ---- market-review state ----
  readonly symbol = signal('BTCUSDT');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly review = signal<MarketReviewResponse | null>(null);
  readonly events = signal<RuntimeEventFrame[]>([]);
  readonly sseStatus = signal<'idle' | 'connecting' | 'live' | 'closed' | 'error'>('idle');

  // ---- post-login API probes (snapshot + watchlist + indicators) ----
  readonly snapshotProbe = signal<ProbeState>(EMPTY_PROBE);
  readonly watchlistProbe = signal<ProbeState>(EMPTY_PROBE);
  readonly indicatorsProbe = signal<ProbeState>(EMPTY_PROBE);
  readonly snapshot = signal<MarketSnapshotDto | null>(null);

  // ---- monitor panel state ----
  readonly monitorSymbols = signal<string[]>(['BTCUSDT', 'SOLUSDT']);
  readonly monitorBusy = signal(false);
  readonly monitorError = signal<string | null>(null);
  readonly monitorReviews = signal<Record<string, MarketReviewSummary | null>>({
    BTCUSDT: null,
    SOLUSDT: null,
  });
  readonly lastMonitorTrigger = signal<MonitoringRunOnceResponse | null>(null);

  private es: EventSource | null = null;
  private monitorPollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (this.authed()) {
      void this.runProbes();
      void this.refreshLatestReviews();
    }
  }

  ngOnDestroy(): void {
    this.teardownStream();
    this.stopMonitorPolling();
  }

  // ----------------------------------------------------------- login flow ----
  onEmailChange(value: string): void {
    this.email.set(value);
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
  }

  async onLogin(): Promise<void> {
    if (this.loginBusy()) return;
    this.loginBusy.set(true);
    this.loginError.set(null);
    try {
      const session = await loginWithPassword(this.email().trim(), this.password());
      setCryptobotSession(session);
      this.password.set(''); // never keep the plaintext password resident
      this.authed.set(true);
      void this.runProbes();
    } catch (e) {
      const err = e as Error & { loginError?: { message: string } };
      this.loginError.set(err.loginError?.message ?? err.message ?? 'Login failed');
    } finally {
      this.loginBusy.set(false);
    }
  }

  onLogout(): void {
    clearCryptobotSession();
    this.teardownStream();
    this.stopMonitorPolling();
    this.authed.set(false);
    this.review.set(null);
    this.events.set([]);
    this.sseStatus.set('idle');
    this.error.set(null);
    this.snapshot.set(null);
    this.snapshotProbe.set(EMPTY_PROBE);
    this.watchlistProbe.set(EMPTY_PROBE);
    this.indicatorsProbe.set(EMPTY_PROBE);
    this.monitorReviews.set({ BTCUSDT: null, SOLUSDT: null });
    this.lastMonitorTrigger.set(null);
    this.monitorError.set(null);
  }

  // -------------------------------------------------------- market-review ----
  onSymbolChange(value: string): void {
    this.symbol.set(value.trim().toUpperCase());
  }

  async onSubmit(): Promise<void> {
    if (!this.authed()) return;
    this.busy.set(true);
    this.error.set(null);
    this.review.set(null);
    this.events.set([]);
    this.teardownStream();
    try {
      const response = await postMarketReview({ symbol: this.symbol() });
      this.review.set(response);
      this.connectSse(response);
    } catch (e) {
      if (this.handleAuthRequired(e)) return;
      const err = e as Error & { apiError?: ApiErrorBody & { status?: number } };
      this.error.set(err.apiError?.message ?? err.message ?? String(e));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------- API probes ----
  /**
   * Hits snapshot + watchlist + indicators in parallel after login so the
   * operator can verify the Bearer token is working across multiple cryptobot
   * endpoints, not just /market-review.
   */
  async runProbes(): Promise<void> {
    const symbol = this.symbol();
    this.snapshotProbe.set({ status: 'loading', detail: '' });
    this.watchlistProbe.set({ status: 'loading', detail: '' });
    this.indicatorsProbe.set({ status: 'loading', detail: '' });

    void this.probe('snapshot', this.snapshotProbe, async () => {
      const snap = await getMarketSnapshot(symbol);
      this.snapshot.set(snap);
      return `price=${snap.price} (source ${snap.source})`;
    });
    void this.probe('watchlist', this.watchlistProbe, async () => {
      const items = await listWatchlist();
      return `${items.length} entr${items.length === 1 ? 'y' : 'ies'}`;
    });
    void this.probe('indicators', this.indicatorsProbe, async () => {
      const items = await listIndicators(symbol, 5);
      return `${items.length} sample${items.length === 1 ? '' : 's'}`;
    });
  }

  private async probe(
    label: string,
    target: { set: (s: ProbeState) => void },
    work: () => Promise<string>,
  ): Promise<void> {
    try {
      const detail = await work();
      target.set({ status: 'ok', detail });
    } catch (e) {
      if (this.handleAuthRequired(e)) return;
      const err = e as Error & { apiError?: ApiErrorBody };
      target.set({
        status: 'err',
        detail: err.apiError?.message ?? err.message ?? `${label} failed`,
      });
    }
  }

  // -------------------------------------------------------- monitor panel ----
  /**
   * Triggers a one-shot monitoring run for BTCUSDT and SOLUSDT, then polls the latest endpoint
   * a few times so the UI reflects PENDING → RUNNING → SUCCEEDED as the runtime reconciles.
   */
  async onTriggerMonitoring(): Promise<void> {
    if (this.monitorBusy()) return;
    this.monitorBusy.set(true);
    this.monitorError.set(null);
    try {
      const response = await triggerMonitoringRunOnce();
      this.lastMonitorTrigger.set(response);
      this.monitorSymbols.set(response.configuredSymbols);
      // Optimistically seed PENDING rows for each triggered run so the cards
      // change colour even before the first poll completes.
      const optimistic: Record<string, MarketReviewSummary | null> = { ...this.monitorReviews() };
      for (const triggered of response.triggered) {
        optimistic[triggered.symbol] = {
          id: triggered.marketReviewRunId ?? triggered.runtimeRunId,
          symbol: triggered.symbol,
          runtimeRunId: triggered.runtimeRunId,
          workflowId: 'crypto.market-review.v1',
          status: 'RUNNING',
          verdict: null,
          summaryPreview: null,
          requestedBy: null,
          startedAt: response.startedAt,
          finishedAt: null,
          updatedAt: response.startedAt,
        };
      }
      this.monitorReviews.set(optimistic);
      this.startMonitorPolling();
    } catch (e) {
      if (this.handleAuthRequired(e)) return;
      const err = e as Error & { apiError?: ApiErrorBody };
      this.monitorError.set(err.apiError?.message ?? err.message ?? 'Monitoring trigger failed');
    } finally {
      this.monitorBusy.set(false);
    }
  }

  async refreshLatestReviews(): Promise<void> {
    try {
      const latest = await getLatestReviews(this.monitorSymbols());
      const byKey: Record<string, MarketReviewSummary | null> = {};
      for (const symbol of this.monitorSymbols()) {
        byKey[symbol] = null;
      }
      for (const row of latest) {
        byKey[row.symbol] = row;
      }
      this.monitorReviews.set(byKey);
    } catch (e) {
      if (this.handleAuthRequired(e)) return;
      const err = e as Error & { apiError?: ApiErrorBody };
      this.monitorError.set(err.apiError?.message ?? err.message ?? 'Could not load monitor history');
    }
  }

  private startMonitorPolling(): void {
    this.stopMonitorPolling();
    let ticks = 0;
    const maxTicks = 30; // ~90s @ 3s interval — plenty for crypto.market-review.v1
    const tick = async () => {
      ticks++;
      await this.refreshLatestReviews();
      const allTerminal = this.monitorSymbols().every((sym) => {
        const row = this.monitorReviews()[sym];
        return row && row.status !== 'RUNNING' && row.status !== 'PENDING';
      });
      if (allTerminal || ticks >= maxTicks) {
        this.stopMonitorPolling();
      }
    };
    this.monitorPollTimer = setInterval(() => void tick(), 3000);
    void tick();
  }

  private stopMonitorPolling(): void {
    if (this.monitorPollTimer != null) {
      clearInterval(this.monitorPollTimer);
      this.monitorPollTimer = null;
    }
  }

  runtimeUiLink(runtimeRunId: string): string {
    return `http://localhost:4202/?runId=${encodeURIComponent(runtimeRunId)}`;
  }

  monitorEntries(): { symbol: string; review: MarketReviewSummary | null }[] {
    const map = this.monitorReviews();
    return this.monitorSymbols().map((symbol) => ({ symbol, review: map[symbol] ?? null }));
  }

  // -------------------------------------------------------- SSE plumbing ----
  connectSse(response: MarketReviewResponse): void {
    this.teardownStream();
    const url = runtimeSseUrl(response.related);
    this.sseStatus.set('connecting');
    const es = new EventSource(url);
    this.es = es;

    es.onopen = () => this.sseStatus.set('live');

    const handle = (msg: MessageEvent) => {
      if (!msg.data || msg.data.startsWith(':')) return;
      try {
        const ev = JSON.parse(msg.data) as RuntimeEventFrame;
        this.events.update((list) => [...list, ev]);
        if (ev.terminal) {
          this.sseStatus.set('closed');
          this.teardownStream();
        }
      } catch (parseErr) {
        console.error('cryptobot-ui: SSE parse error', parseErr, msg.data);
      }
    };

    es.onmessage = handle;
    [
      'RUN_STARTED',
      'RUN_SUCCEEDED',
      'RUN_FAILED',
      'RUN_CANCELLED',
      'STAGE_STARTED',
      'STAGE_SUCCEEDED',
      'STAGE_FAILED',
      'TOOL_STARTED',
      'TOOL_SUCCEEDED',
      'TOOL_FAILED',
    ].forEach((type) => es.addEventListener(type, handle));

    es.onerror = () => {
      if (this.sseStatus() === 'closed') return;
      this.sseStatus.set('error');
    };
  }

  // -------------------------------------------------------- formatting ----
  formatNumber(value: number | undefined | null, digits = 2): string {
    if (value == null || !Number.isFinite(value)) return '—';
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  indicatorEntries(indicators: Record<string, number> | undefined): { key: string; value: number }[] {
    if (!indicators) return [];
    return Object.entries(indicators).map(([key, value]) => ({ key, value }));
  }

  formatTime(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
    } catch {
      return iso;
    }
  }

  // -------------------------------------------------------- helpers ----
  /**
   * If `e` is AuthRequiredError, the cryptobot-api layer has already cleared
   * the session — we just flip the auth signal so the template re-renders the
   * login screen. Returns true when the error was an auth one (so the caller
   * can short-circuit its own error path).
   */
  private handleAuthRequired(e: unknown): boolean {
    if (e instanceof AuthRequiredError) {
      this.teardownStream();
      this.authed.set(false);
      this.loginError.set('Session expired, please sign in again.');
      return true;
    }
    return false;
  }

  private teardownStream(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }
}
