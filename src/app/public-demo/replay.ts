/**
 * The public replay's network layer. In the public build `apiFetch` (cryptobot-api.ts) calls
 * `replayApiFetch` instead of `fetch`: every read is answered from `snapshot.json`, a sanitized
 * recording of a real CryptoBot run on Solana devnet, and nothing leaves the browser.
 *
 * Rules, in order:
 *   1. exact `METHOD path?query` recorded            → that response;
 *   2. GET whose path (without query) was recorded   → that response; an array is cut to `?limit=`;
 *   3. any other non-GET                             → 405 READ_ONLY_REPLAY (a write is never replayed);
 *   4. anything else                                 → 404 NOT_IN_REPLAY.
 * The only non-GET entries in a snapshot are the pure verification calls the recorder captured
 * (`POST /receipts/{h}/verify`, `POST /anchors/{root}/verify`): they compute, they do not write.
 */

export interface ReplayRun {
  /** what was run, in words a visitor can check (e.g. the explorer link next to it) */
  label: string;
  /** ISO date of the run */
  date: string;
}

export interface ReplayMeta {
  format: 'cryptobot-public-replay/v1';
  network: 'devnet';
  recordedAt: string;
  runs: ReplayRun[];
}

export interface ReplayEntry {
  status: number;
  body: unknown;
}

export interface ReplaySnapshot {
  meta: ReplayMeta;
  /** key: `METHOD /path[?query]`, relative to /api/cryptobot */
  responses: Record<string, ReplayEntry>;
}

export const READ_ONLY_REPLAY = 'READ_ONLY_REPLAY';
export const NOT_IN_REPLAY = 'NOT_IN_REPLAY';

/** Pure: what the replay answers for one call. Exported for the tests. */
export function resolveReplay(snapshot: ReplaySnapshot, method: string, path: string): ReplayEntry {
  const m = (method || 'GET').toUpperCase();
  const exact = snapshot.responses[`${m} ${path}`];
  if (exact) return exact;
  const q = path.indexOf('?');
  const pathname = q >= 0 ? path.slice(0, q) : path;
  if (m === 'GET') {
    const byPath = snapshot.responses[`GET ${pathname}`];
    if (byPath) {
      const limit = q >= 0 ? Number.parseInt(new URLSearchParams(path.slice(q + 1)).get('limit') ?? '', 10) : NaN;
      if (Array.isArray(byPath.body) && Number.isFinite(limit) && limit >= 0) {
        return { status: byPath.status, body: byPath.body.slice(0, limit) };
      }
      return byPath;
    }
    return {
      status: 404,
      body: { error: NOT_IN_REPLAY, message: 'This public replay does not include that record.' },
    };
  }
  return {
    status: 405,
    body: { error: READ_ONLY_REPLAY, message: 'This is a read-only replay of a real devnet run: nothing can be changed or executed from here.' },
  };
}

let loaded: Promise<ReplaySnapshot> | null = null;

/** The snapshot, loaded once (a lazy chunk: the first screen does not wait for it). */
export function replaySnapshot(): Promise<ReplaySnapshot> {
  loaded ??= import('./snapshot.json').then((m) => (m.default ?? m) as unknown as ReplaySnapshot);
  return loaded;
}

/** `fetch` for the public build: same Response shape the API clients already parse. */
export async function replayApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const entry = resolveReplay(await replaySnapshot(), init.method ?? 'GET', path);
  return new Response(JSON.stringify(entry.body), {
    status: entry.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
