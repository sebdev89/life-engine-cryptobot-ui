/**
 * "Verify it yourself": the browser asks Solana devnet — not our backend — for the anchor transaction,
 * reads the memo the anchor wrote (`ir/1 root=sha256:… n=… ts=…`) and compares that root with the root
 * of the ValueEvent the page shows. It is the ONLY request the public replay makes outside its own
 * origin, and it is a read: one JSON-RPC `getTransaction` to the public devnet endpoint, no key, no
 * signature, nothing written. The CSP of the public image allows exactly this origin (connect-src).
 *
 * When devnet cannot answer (429, offline, timeout), the page says so and shows the recorded result
 * instead of pretending it checked.
 */

/** Public Solana devnet RPC. Hard-coded on purpose: the page cannot be pointed at another host. */
export const DEVNET_RPC = 'https://api.devnet.solana.com';

/** The JSON-RPC method of the live check. */
export const RPC_METHOD = 'getTransaction';

/** Every method this page may call on devnet: reads only. `getSlot` feeds the live network bar. */
export const RPC_READS: readonly string[] = ['getTransaction', 'getSlot'];

export interface AnchorMemo {
  root: string;
  /** leaves in the anchored batch */
  n: number | null;
  ts: string | null;
}

export type DevnetVerdict =
  | { state: 'match' | 'mismatch'; memo: AnchorMemo; slot: number | null; blockTime: number | null; finalized: boolean; programErr: boolean }
  | { state: 'no-memo'; slot: number | null; blockTime: number | null }
  | { state: 'unavailable'; reason: string };

export function rpcBody(signature: string): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: RPC_METHOD,
    params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'finalized' }],
  });
}

const MEMO_RE = /ir\/1 root=(sha256:[0-9a-f]{64})(?: n=(\d+))?(?: ts=(\S+))?/;

/** The anchor memo inside one memo string (instruction `parsed` or a "Program log: Memo" line). */
export function parseMemo(text: string | null | undefined): AnchorMemo | null {
  if (!text) return null;
  const m = MEMO_RE.exec(text);
  if (!m) return null;
  return { root: m[1], n: m[2] ? Number(m[2]) : null, ts: m[3] ?? null };
}

interface ParsedIx {
  program?: string;
  programId?: string;
  parsed?: unknown;
}

/** Finds the anchor memo in a `getTransaction` (jsonParsed) result: the memo instruction first, the logs as a fallback. */
export function memoFromTransaction(result: unknown): AnchorMemo | null {
  const r = result as {
    transaction?: { message?: { instructions?: ParsedIx[] } };
    meta?: { logMessages?: string[] | null; innerInstructions?: { instructions?: ParsedIx[] }[] | null };
  } | null;
  if (!r) return null;
  const ixs: ParsedIx[] = [...(r.transaction?.message?.instructions ?? []), ...(r.meta?.innerInstructions ?? []).flatMap((i) => i.instructions ?? [])];
  for (const ix of ixs) {
    if (ix.program === 'spl-memo' && typeof ix.parsed === 'string') {
      const m = parseMemo(ix.parsed);
      if (m) return m;
    }
  }
  for (const line of r.meta?.logMessages ?? []) {
    const m = parseMemo(line);
    if (m) return m;
  }
  return null;
}

/** Pure verdict from an RPC result; `expectedRoot` is the root the ValueEvent (snapshot) says was anchored. */
export function verdictFrom(result: unknown, expectedRoot: string): DevnetVerdict {
  const r = result as { slot?: number; blockTime?: number | null; meta?: { err?: unknown } | null } | null;
  if (!r) return { state: 'unavailable', reason: 'devnet does not return this transaction (pruned or not finalized)' };
  const slot = typeof r.slot === 'number' ? r.slot : null;
  const blockTime = typeof r.blockTime === 'number' ? r.blockTime : null;
  const memo = memoFromTransaction(result);
  if (!memo) return { state: 'no-memo', slot, blockTime };
  return {
    state: memo.root === expectedRoot ? 'match' : 'mismatch',
    memo,
    slot,
    blockTime,
    // commitment: 'finalized' in the request: a result means the transaction is finalized
    finalized: true,
    programErr: r.meta?.err !== null && r.meta?.err !== undefined,
  };
}

/** The live check. `fetchImpl` is injectable for the tests; nothing here ever writes. */
export async function verifyOnDevnet(
  signature: string,
  expectedRoot: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 9000,
): Promise<DevnetVerdict> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(DEVNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rpcBody(signature),
      signal: ctl?.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (res.status === 429) return { state: 'unavailable', reason: 'devnet is rate-limiting requests (429)' };
    if (!res.ok) return { state: 'unavailable', reason: `devnet answered HTTP ${res.status}` };
    const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (body.error) return { state: 'unavailable', reason: `devnet: ${body.error.message ?? 'RPC error'}` };
    return verdictFrom(body.result ?? null, expectedRoot);
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    return { state: 'unavailable', reason: aborted ? 'devnet did not answer in time' : 'devnet could not be reached from this browser' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** `sha256:…` hex of a root without the prefix, split in 4 groups for the eye: `0960c920 bc100fce …`. */
export function groups(hash: string, size = 8): string[] {
  const hex = hash.startsWith('sha256:') ? hash.slice(7) : hash;
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += size) out.push(hex.slice(i, i + size));
  return out;
}

/** Current finalized slot of devnet, or null when it cannot be read (the network bar then hides). */
export async function devnetSlot(fetchImpl: typeof fetch = fetch, timeoutMs = 6000): Promise<number | null> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(DEVNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [{ commitment: 'finalized' }] }),
      signal: ctl?.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: unknown };
    return typeof body.result === 'number' && Number.isFinite(body.result) ? body.result : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
