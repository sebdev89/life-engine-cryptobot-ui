/**
 * Thin HTTP/SSE helpers for `cryptobot-service` and the runtime SSE stream that follows. No Angular
 * DI — keeps the bundle tiny and the contract obvious. Same shape as the existing runtime-ui
 * `runtime-api.ts` so the conventions match.
 *
 * All authenticated calls go through `apiFetch`, which transparently attaches the Bearer token
 * from session.ts and surfaces a 401 as `AuthRequiredError` (after clearing the session) so the
 * component can route the user back to the login screen.
 */

import { authorizationHeaders, clearCryptobotSession, getAccessToken } from './session';

export const CRYPTOBOT_API_BASE = 'http://localhost:8091';

export interface MarketReviewRequest {
  symbol: string;
  correlationId?: string;
}

export interface MarketSnapshotDto {
  symbol: string;
  source: string;
  price: number;
  priceChangePct24h: number;
  volumeBase24h: number;
  observedAt: string;
}

export interface MarketSignalResponseDto {
  signal: string;
  strength: string;
  reason: string;
  indicators: Record<string, number>;
}

export interface RelatedRuntimeRunDto {
  runtimeRunId: string;
  runtimeWorkflowId: string;
  runtimeCorrelationId: string;
  runtimeBaseUrl: string;
  ssePath: string;
}

export interface MarketReviewResponse {
  marketReviewId: string;
  symbol: string;
  snapshot: MarketSnapshotDto;
  signal: MarketSignalResponseDto;
  related: RelatedRuntimeRunDto;
  createdAt: string;
  /** Local cryptobot-side linkage row id (may be null if persistence is unavailable). */
  marketReviewRunId?: string | null;
}

/** Mirrors {@code MarketReviewSummaryResponse} from `MarketReviewsQueryController`. */
export interface MarketReviewSummary {
  id: string;
  symbol: string;
  runtimeRunId: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | string;
  verdict?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNKNOWN' | null;
  summaryPreview?: string | null;
  requestedBy?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringTriggeredRun {
  symbol: string;
  runtimeRunId: string;
  marketReviewRunId?: string | null;
}

export interface MonitoringRunOnceResponse {
  startedAt: string;
  finishedAt: string;
  configuredSymbols: string[];
  triggered: MonitoringTriggeredRun[];
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
}

/** Thrown by `apiFetch` when the backend rejects the access token. The session
 *  has already been cleared by the time this hits the caller, so the component
 *  just needs to re-render to land on the login screen. */
export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

function apiRoot(): string {
  return `${CRYPTOBOT_API_BASE.replace(/\/$/, '')}/api/cryptobot`;
}

export function parseApiError(status: number, raw: string): ApiErrorBody & { status: number } {
  try {
    const parsed = JSON.parse(raw) as ApiErrorBody;
    return { status, code: parsed.code, message: parsed.message ?? raw };
  } catch {
    return { status, message: raw || `HTTP ${status}` };
  }
}

/**
 * Single chokepoint for every authenticated cryptobot call. Merges the caller's
 * headers with the current `Authorization: Bearer …` (if any) and converts a 401
 * into AuthRequiredError + a cleared session.
 */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
    ...authorizationHeaders(),
  };
  const res = await fetch(`${apiRoot()}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearCryptobotSession();
    throw new AuthRequiredError();
  }
  return res;
}

async function throwHttp(res: Response): Promise<never> {
  const body = await res.text();
  const err = parseApiError(res.status, body);
  throw Object.assign(new Error(formatApiError(err)), { apiError: err });
}

export async function postMarketReview(request: MarketReviewRequest): Promise<MarketReviewResponse> {
  const res = await apiFetch('/market-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) return throwHttp(res);
  return (await res.json()) as MarketReviewResponse;
}

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshotDto> {
  const res = await apiFetch(`/snapshots/${encodeURIComponent(symbol)}`);
  if (!res.ok) return throwHttp(res);
  return (await res.json()) as MarketSnapshotDto;
}

/**
 * Returns the array of watchlist entries (shape opaque to this UI). The
 * endpoint is "best effort" for the dashboard probe — callers should be
 * resilient to an empty array.
 */
export async function listWatchlist(symbol?: string): Promise<unknown[]> {
  const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  const res = await apiFetch(`/watchlist${qs}`);
  if (!res.ok) return throwHttp(res);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

export async function listIndicators(symbol: string, limit = 5): Promise<unknown[]> {
  const qs = `?symbol=${encodeURIComponent(symbol)}&limit=${limit}`;
  const res = await apiFetch(`/indicators${qs}`);
  if (!res.ok) return throwHttp(res);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

/**
 * Returns the most-recent persisted review per symbol (one row per symbol, may be empty for
 * symbols that have never been monitored). Server-side endpoint:
 * `GET /api/cryptobot/market-reviews/latest?symbols=BTCUSDT,SOLUSDT`.
 */
export async function getLatestReviews(symbols: string[]): Promise<MarketReviewSummary[]> {
  if (symbols.length === 0) return [];
  const qs = `?symbols=${symbols.map(encodeURIComponent).join(',')}`;
  const res = await apiFetch(`/market-reviews/latest${qs}`);
  if (!res.ok) return throwHttp(res);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as MarketReviewSummary[]) : [];
}

/** Returns history for a single symbol, newest first. */
export async function getReviewHistory(
  symbol: string,
  limit = 20,
): Promise<MarketReviewSummary[]> {
  const qs = `?symbol=${encodeURIComponent(symbol)}&limit=${limit}`;
  const res = await apiFetch(`/market-reviews${qs}`);
  if (!res.ok) return throwHttp(res);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as MarketReviewSummary[]) : [];
}

/**
 * Triggers a manual monitoring tick: starts a market-review runtime run for each configured
 * symbol immediately. Endpoint: `POST /api/cryptobot/monitoring/run-once`.
 */
export async function triggerMonitoringRunOnce(): Promise<MonitoringRunOnceResponse> {
  const res = await apiFetch('/monitoring/run-once', { method: 'POST' });
  if (!res.ok) return throwHttp(res);
  return (await res.json()) as MonitoringRunOnceResponse;
}

export async function getCryptobotHealth(): Promise<unknown> {
  // Health is intentionally unauthenticated, so don't go through apiFetch.
  const res = await fetch(`${apiRoot()}/health`);
  if (!res.ok) {
    throw new Error(`cryptobot-service health failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export function formatApiError(err: ApiErrorBody & { status?: number }): string {
  const code = err.code ? `[${err.code}] ` : '';
  return `${code}${err.message ?? 'Request failed'}`;
}

/**
 * Builds the SSE URL on `runtimeBaseUrl` for a related runtime run, embedding the operator's
 * access token as `?access_token=…` (because EventSource cannot set headers). The runtime's filter
 * accepts the query param ONLY for the SSE GET endpoints.
 */
export function runtimeSseUrl(related: Pick<RelatedRuntimeRunDto, 'runtimeBaseUrl' | 'ssePath'>): string {
  const base = `${related.runtimeBaseUrl.replace(/\/$/, '')}${related.ssePath}`;
  const token = getAccessToken();
  return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
}
