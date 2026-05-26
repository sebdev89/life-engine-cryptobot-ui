/**
 * Thin HTTP/SSE helpers for `cryptobot-service` and the runtime SSE stream that follows. No Angular
 * DI — keeps the bundle tiny and the contract obvious. Same shape as the existing runtime-ui
 * `runtime-api.ts` so the conventions match.
 */

import { authorizationHeaders, getAccessToken } from './session';

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
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
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

export async function postMarketReview(request: MarketReviewRequest): Promise<MarketReviewResponse> {
  const res = await fetch(`${apiRoot()}/market-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authorizationHeaders() },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = parseApiError(res.status, body);
    throw Object.assign(new Error(formatApiError(err)), { apiError: err });
  }
  return (await res.json()) as MarketReviewResponse;
}

export async function getCryptobotHealth(): Promise<unknown> {
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
