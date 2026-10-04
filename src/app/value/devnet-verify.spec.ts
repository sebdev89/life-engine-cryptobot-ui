import { describe, expect, it, vi } from 'vitest';
import snapshotJson from '../public-demo/snapshot.json';
import type { ReplaySnapshot } from '../public-demo/replay';
import { DEVNET_RPC, RPC_METHOD, groups, memoFromTransaction, parseMemo, rpcBody, verdictFrom, verifyOnDevnet } from './devnet-verify';

const ROOT = 'sha256:0960c920bc100fcedd841921174871f30a692a32eb58e3213b4d5bcc341dfd50';
const SIG = '47X9tshe8bvHsUfvUU2FwetQ4En5L111A7HNftWsY3N8vBehVYpVFhM5eeCcUy6GfkpAuuUmMQ4p6tMpFeXGK544';
const MEMO = `ir/1 root=${ROOT} n=1 ts=2026-10-04T04:47:09Z`;

/** trimmed from the real devnet answer for the anchor of the recorded ValueEvent (getTransaction, jsonParsed) */
const RESULT = {
  slot: 507246166,
  blockTime: 1791089230,
  meta: {
    err: null,
    logMessages: ['Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]', `Program log: Memo (len 109): "${MEMO}"`],
  },
  transaction: { message: { instructions: [{ parsed: MEMO, program: 'spl-memo', programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' }] } },
};

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('devnet verify — the one live read', () => {
  it('talks only to the public devnet RPC, with a read-only method', () => {
    expect(DEVNET_RPC).toBe('https://api.devnet.solana.com');
    expect(RPC_METHOD).toBe('getTransaction');
    const b = JSON.parse(rpcBody(SIG));
    expect(b.method).toBe('getTransaction');
    expect(b.params[0]).toBe(SIG);
    expect(b.params[1]).toEqual({ encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'finalized' });
  });

  it('parses the anchor memo, from the instruction or from the logs', () => {
    expect(parseMemo(MEMO)).toEqual({ root: ROOT, n: 1, ts: '2026-10-04T04:47:09Z' });
    expect(parseMemo('hello')).toBeNull();
    expect(memoFromTransaction(RESULT)?.root).toBe(ROOT);
    expect(memoFromTransaction({ ...RESULT, transaction: { message: { instructions: [] } } })?.root).toBe(ROOT);
    expect(memoFromTransaction(null)).toBeNull();
  });

  it('MATCH with the real slot and block time when the memo root is the event root', () => {
    const v = verdictFrom(RESULT, ROOT);
    expect(v.state).toBe('match');
    if (v.state === 'match') {
      expect(v.slot).toBe(507246166);
      expect(v.blockTime).toBe(1791089230);
      expect(v.memo.n).toBe(1);
      expect(v.programErr).toBe(false);
    }
  });

  it('the recorded ValueEvent root is the one this test pins (so the live check compares the right thing)', () => {
    const s = snapshotJson as unknown as ReplaySnapshot;
    const ev = (s.responses['GET /value-events'].body as { anchor: { root: string; txSignature: string; slot: number } }[])[0];
    expect(ev.anchor.root).toBe(ROOT);
    expect(ev.anchor.txSignature).toBe(SIG);
    expect(ev.anchor.slot).toBe(RESULT.slot);
  });

  it('a different root is a mismatch, a transaction without memo says so, a missing one is unavailable', () => {
    expect(verdictFrom(RESULT, 'sha256:' + 'f'.repeat(64)).state).toBe('mismatch');
    expect(verdictFrom({ ...RESULT, meta: { err: null, logMessages: [] }, transaction: { message: { instructions: [] } } }, ROOT).state).toBe('no-memo');
    expect(verdictFrom(null, ROOT).state).toBe('unavailable');
  });

  it('verifyOnDevnet: POSTs once to devnet and returns the verdict', async () => {
    const f = respond(200, { jsonrpc: '2.0', id: 1, result: RESULT });
    const v = await verifyOnDevnet(SIG, ROOT, f);
    expect(v.state).toBe('match');
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe(DEVNET_RPC);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(String(init.body)).method).toBe('getTransaction');
  });

  it('429, HTTP errors, RPC errors and network failures fall back explicitly (never a fake match)', async () => {
    expect((await verifyOnDevnet(SIG, ROOT, respond(429, {}))).state).toBe('unavailable');
    expect((await verifyOnDevnet(SIG, ROOT, respond(503, {}))).state).toBe('unavailable');
    expect((await verifyOnDevnet(SIG, ROOT, respond(200, { error: { message: 'boom' } }))).state).toBe('unavailable');
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const v = await verifyOnDevnet(SIG, ROOT, down);
    expect(v.state).toBe('unavailable');
    if (v.state === 'unavailable') expect(v.reason).toContain('could not be reached');
  });

  it('groups a root in 8-hex blocks for the side-by-side comparison', () => {
    const g = groups(ROOT);
    expect(g.length).toBe(8);
    expect(g[0]).toBe('0960c920');
    expect(g.join('')).toBe(ROOT.slice(7));
  });
});
