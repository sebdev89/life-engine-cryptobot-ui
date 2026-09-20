/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlossaryEvent, GlossaryTelemetry, postGlossaryEvents } from './glossary-telemetry';
import { clearCryptobotSession } from '../session';

const SESSION_KEY = 'life-engine-cryptobot.session';

function withSession(token = 'x'.repeat(40)): void {
  clearCryptobotSession();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token }));
}

describe('GlossaryTelemetry batching', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends one batch after the idle window, not one request per event', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const t = new GlossaryTelemetry({ flushAfterMs: 1000, send, hasSession: () => true });

    t.record({ action: 'open', term: 'PDA' });
    t.record({ action: 'open', term: 'blockhash' });
    t.record({ action: 'search', term: 'slippage', hit: true });
    expect(send).not.toHaveBeenCalled();
    expect(t.pending()).toBe(3);

    vi.advanceTimersByTime(999);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual<GlossaryEvent[]>([
      { action: 'open', term: 'PDA' },
      { action: 'open', term: 'blockhash' },
      { action: 'search', term: 'slippage', hit: true },
    ]);
    expect(send.mock.calls[0][1]).toBe(false);
    expect(t.pending()).toBe(0);
  });

  it('sends immediately when the batch is full', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const t = new GlossaryTelemetry({ flushAfterMs: 60_000, maxBatch: 3, send, hasSession: () => true });
    t.record({ action: 'open', term: 'a' });
    t.record({ action: 'open', term: 'b' });
    expect(send).not.toHaveBeenCalled();
    t.record({ action: 'copy', term: 'c' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(3);
  });

  it('drops events without a session instead of queueing them', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const t = new GlossaryTelemetry({ flushAfterMs: 10, send, hasSession: () => false });
    t.record({ action: 'open', term: 'PDA' });
    vi.advanceTimersByTime(50);
    expect(t.pending()).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('flushes with final=true when the page is hidden, and never throws on a failed send', () => {
    const send = vi.fn().mockRejectedValue(new Error('network down'));
    const t = new GlossaryTelemetry({ flushAfterMs: 60_000, send, hasSession: () => true });
    t.bindLifecycle(document, window);
    t.record({ action: 'open', term: 'PDA' });

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    expect(() => document.dispatchEvent(new Event('visibilitychange'))).not.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toBe(true);

    t.unbindLifecycle();
    t.record({ action: 'open', term: 'again' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(send).toHaveBeenCalledTimes(1); // unbound: nothing more went out
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('flush() with an empty buffer does not call the sender', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const t = new GlossaryTelemetry({ send, hasSession: () => true });
    t.flush();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('postGlossaryEvents transport', () => {
  beforeEach(() => {
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
  });
  afterEach(() => {
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
    vi.restoreAllMocks();
  });

  it('POSTs {events} with the bearer token to /api/cryptobot/glossary/events, keepalive on final', async () => {
    withSession('t'.repeat(40));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"accepted":1,"rejected":0}', { status: 202 }));

    await postGlossaryEvents([{ action: 'open', term: 'PDA' }], true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8091/api/cryptobot/glossary/events');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${'t'.repeat(40)}`);
    expect(JSON.parse(init.body as string)).toEqual({ events: [{ action: 'open', term: 'PDA' }] });
  });

  it('sends nothing without a token and swallows transport errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(postGlossaryEvents([{ action: 'open', term: 'PDA' }])).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    withSession();
    await expect(postGlossaryEvents([{ action: 'copy', term: 'PDA' }])).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('the payload never carries the query text, a user or a session', async () => {
    withSession();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
    await postGlossaryEvents([{ action: 'search', hit: false }, { action: 'search', term: 'blockhash', hit: true }]);
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as { events: Record<string, unknown>[] };
    for (const e of body.events) {
      expect(Object.keys(e).sort()).toEqual(expect.arrayContaining(['action']));
      expect(Object.keys(e)).not.toContain('query');
      expect(Object.keys(e)).not.toContain('user');
      expect(Object.keys(e)).not.toContain('session');
    }
  });
});
