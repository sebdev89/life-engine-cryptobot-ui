/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getValueEvent, getValueProof, listIdentities, listValueEvents } from './value-events-api';
import { clearCryptobotSession } from './session';

const SESSION_KEY = 'life-engine-cryptobot.session';

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('value-events-api', () => {
  beforeEach(() => {
    clearCryptobotSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'demo-token-'.padEnd(40, 'x') }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
  });

  it('lists with the limit, on /value-events, carrying the bearer token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([{ id: 'v1' }]));
    const out = await listValueEvents(50);
    expect(out).toEqual([{ id: 'v1' }]);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/value-events?limit=50');
    expect((init.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
  });

  it('reads one event and its proof by id (encoded)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(ok({ id: 'a/b' })).mockResolvedValueOnce(ok({ receiptHash: 'h', verified: true }));
    await getValueEvent('a/b');
    const proof = await getValueProof('a/b');
    expect((spy.mock.calls[0] as [string])[0]).toContain('/value-events/a%2Fb');
    expect((spy.mock.calls[1] as [string])[0]).toContain('/value-events/a%2Fb/proof');
    expect(proof.verified).toBe(true);
  });

  it('reads identities', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listIdentities();
    expect((spy.mock.calls[0] as [string])[0]).toMatch(/\/identities$/);
  });

  it('turns an HTTP error into a thrown error with the API body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ code: 'NOT_FOUND', message: 'no such event' }, 404));
    await expect(getValueEvent('x')).rejects.toThrow(/no such event/);
  });
});
