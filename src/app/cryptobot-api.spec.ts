/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatApiError, parseApiError, postMarketReview, runtimeSseUrl } from './cryptobot-api';
import { clearCryptobotSession } from './session';

const SESSION_KEY = 'life-engine-cryptobot.session';

describe('cryptobot-api error helpers', () => {
  it('parses structured error body', () => {
    const err = parseApiError(400, JSON.stringify({ code: 'INVALID_SYMBOL', message: 'bad' }));
    expect(err.code).toBe('INVALID_SYMBOL');
    expect(err.message).toBe('bad');
  });

  it('formats with code prefix', () => {
    expect(formatApiError({ code: 'X', message: 'msg' })).toBe('[X] msg');
  });
});

describe('auth-aware cryptobot-api', () => {
  beforeEach(() => {
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
  });

  afterEach(() => {
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
  });

  it('postMarketReview omits Authorization when no session', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          marketReviewId: 'mr-1',
          symbol: 'BTCUSDT',
          snapshot: { symbol: 'BTCUSDT', source: 'deterministic-local', price: 50000, priceChangePct24h: 2, volumeBase24h: 100, observedAt: '2026-05-20T00:00:00Z' },
          signal: { signal: 'BUY', strength: 'MEDIUM', reason: 'r', indicators: {} },
          related: { runtimeRunId: 'r1', runtimeWorkflowId: 'crypto.market-review.v1', runtimeCorrelationId: 'c', runtimeBaseUrl: 'http://localhost:8090', ssePath: '/api/runtime/runs/r1/stream' },
          createdAt: '2026-05-20T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await postMarketReview({ symbol: 'BTCUSDT' });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    fetchSpy.mockRestore();
  });

  it('postMarketReview sends Authorization header when token stored', async () => {
    const token = 'x'.repeat(40);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token }));
    clearCryptobotSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token }));

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await postMarketReview({ symbol: 'BTCUSDT' }).catch(() => undefined);

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${token}`);
    fetchSpy.mockRestore();
  });

  it('runtimeSseUrl appends access_token query when token stored', () => {
    const token = 'y'.repeat(40);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token }));
    clearCryptobotSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token }));

    const url = runtimeSseUrl({
      runtimeBaseUrl: 'http://localhost:8090',
      ssePath: '/api/runtime/runs/r1/stream',
    });
    expect(url).toBe(`http://localhost:8090/api/runtime/runs/r1/stream?access_token=${encodeURIComponent(token)}`);
  });

  it('runtimeSseUrl omits query when no session', () => {
    const url = runtimeSseUrl({
      runtimeBaseUrl: 'http://localhost:8090',
      ssePath: '/api/runtime/runs/r2/stream',
    });
    expect(url).toBe('http://localhost:8090/api/runtime/runs/r2/stream');
  });
});
