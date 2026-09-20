/**
 * KAN-353 — what people do in the glossary, measured. The drawer records `open`, `search` and
 * `copy` events here; they are batched and POSTed to `cryptobot-service`
 * (`POST /api/cryptobot/glossary/events`), which turns them into Prometheus counters for the
 * Grafana board. The UI never talks to Prometheus or Grafana.
 *
 * Rules: nothing about the person travels (no user, tenant, session or query text — a search
 * reports only the term it resolved to and whether it hit); the UI is never blocked (fire and
 * forget, a failed batch is dropped, no retry); a batch goes out after a short idle, when it is
 * full, or when the page is hidden/closed (`keepalive`). Without a session there is no token to
 * send with, so events before login are dropped rather than queued.
 */

import { uiConfig } from '../config';
import { getAccessToken } from '../session';

export type GlossaryAction = 'open' | 'search' | 'copy';

export interface GlossaryEvent {
  /** Canonical glossary term. Omitted for a search that matched nothing. */
  term?: string;
  action: GlossaryAction;
  /** Only for `search`: whether the query matched at least one entry. */
  hit?: boolean;
}

export type GlossarySender = (events: GlossaryEvent[], final: boolean) => Promise<void>;

export interface GlossaryTelemetryOptions {
  /** Idle time after the last event before a batch is sent. */
  flushAfterMs?: number;
  /** A batch this size is sent at once (the service accepts up to 100). */
  maxBatch?: number;
  send?: GlossarySender;
  hasSession?: () => boolean;
}

/** The real transport: one authenticated POST, errors swallowed. `final` batches use `keepalive`. */
export async function postGlossaryEvents(events: GlossaryEvent[], final = false): Promise<void> {
  const token = getAccessToken();
  if (!token || events.length === 0) return;
  try {
    await fetch(`${uiConfig().cryptobotBase}/api/cryptobot/glossary/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ events }),
      keepalive: final,
    });
  } catch {
    // Telemetry never surfaces: no retry, no log, no UI.
  }
}

export class GlossaryTelemetry {
  private readonly flushAfterMs: number;
  private readonly maxBatch: number;
  private readonly send: GlossarySender;
  private readonly hasSession: () => boolean;
  private buffer: GlossaryEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unbind: (() => void) | null = null;

  constructor(options: GlossaryTelemetryOptions = {}) {
    this.flushAfterMs = options.flushAfterMs ?? 3000;
    this.maxBatch = options.maxBatch ?? 25;
    this.send = options.send ?? postGlossaryEvents;
    this.hasSession = options.hasSession ?? (() => getAccessToken() !== null);
  }

  /** Queue one event. Dropped silently without a session. */
  record(event: GlossaryEvent): void {
    if (!this.hasSession()) return;
    this.buffer.push(event);
    if (this.buffer.length >= this.maxBatch) {
      this.flush();
      return;
    }
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), this.flushAfterMs);
    }
  }

  /** Send whatever is queued now. `final` marks a page-hide flush (keepalive transport). */
  flush(final = false): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const batch = this.buffer;
    this.buffer = [];
    if (batch.length === 0) return;
    void this.send(batch, final).catch(() => undefined);
  }

  /** Events waiting to be sent (for tests and the drawer's close). */
  pending(): number {
    return this.buffer.length;
  }

  /** Flush when the tab is hidden or the page unloads, so the last clicks are not lost. Idempotent. */
  bindLifecycle(doc: Document = document, win: Window = window): void {
    if (this.unbind) return;
    const onVisibility = () => {
      if (doc.visibilityState === 'hidden') this.flush(true);
    };
    const onPageHide = () => this.flush(true);
    doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('pagehide', onPageHide);
    this.unbind = () => {
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('pagehide', onPageHide);
      this.unbind = null;
    };
  }

  unbindLifecycle(): void {
    this.unbind?.();
  }
}

/** The app-wide instance the drawer uses. */
export const glossaryTelemetry = new GlossaryTelemetry();
