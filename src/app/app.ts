import { Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiErrorBody,
  CRYPTOBOT_API_BASE,
  MarketReviewResponse,
  postMarketReview,
  runtimeSseUrl,
} from './cryptobot-api';
import { getAccessToken } from './session';

interface RuntimeEventFrame {
  type: string;
  stageId?: string | null;
  timestamp?: string;
  terminal?: boolean;
  payload?: Record<string, string>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  readonly cryptobotApiBase = CRYPTOBOT_API_BASE;

  readonly symbol = signal('BTCUSDT');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly review = signal<MarketReviewResponse | null>(null);
  readonly events = signal<RuntimeEventFrame[]>([]);
  readonly sseStatus = signal<'idle' | 'connecting' | 'live' | 'closed' | 'error'>('idle');

  private es: EventSource | null = null;

  hasToken(): boolean {
    return !!getAccessToken();
  }

  onSymbolChange(value: string): void {
    this.symbol.set(value.trim().toUpperCase());
  }

  async onSubmit(): Promise<void> {
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
      const err = e as Error & { apiError?: ApiErrorBody & { status?: number } };
      this.error.set(err.apiError?.message ?? err.message ?? String(e));
    } finally {
      this.busy.set(false);
    }
  }

  ngOnDestroy(): void {
    this.teardownStream();
  }

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

  private teardownStream(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }
}
