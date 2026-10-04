import { rootFromProof, Sha256, webCryptoSha256 } from '../merkle';
import { browserProofCheck } from '../value/browser-proof';
import { ValueProof } from '../value-events-api';
import { NAV_LINKS } from '../shell/top-nav';
import { routes } from '../app.routes';
import { OPERATOR_ONLY_PATHS, PUBLIC_DEMO } from './flag';
import { NOT_IN_REPLAY, READ_ONLY_REPLAY, ReplaySnapshot, resolveReplay } from './replay';
import { formatRunDates } from './replay-banner';
import snapshotJson from './snapshot.json';
import patternsJson from './hygiene-patterns.json';

const snapshot = snapshotJson as unknown as ReplaySnapshot;
const PATTERNS = Object.entries(patternsJson.patterns).map(([name, src]) => [name, new RegExp(src, 'i')] as const);
/** WebCrypto SHA-256 (merkle.spec.ts checks it against an independent reference implementation) */
const nodeSha: Sha256 = webCryptoSha256() as Sha256;
const body = <T>(key: string): T => {
  const e = snapshot.responses[key];
  if (!e) throw new Error(`snapshot has no ${key}`);
  return e.body as T;
};

describe('public replay — build flag', () => {
  it('is off in the default build (the unit tests run the operator build)', () => {
    expect(PUBLIC_DEMO).toBe(false);
  });

  it('every operator-only path is a real route and a nav link of the operator build, so the public build has something to drop', () => {
    const paths = new Set(routes.map((r) => r.path));
    const nav = new Set(NAV_LINKS.map((l) => l.path.slice(1)));
    for (const p of OPERATOR_ONLY_PATHS) {
      expect(paths.has(p)).toBe(true);
      expect(nav.has(p)).toBe(true);
    }
  });
});

describe('public replay — resolveReplay', () => {
  const s: ReplaySnapshot = {
    meta: snapshot.meta,
    responses: {
      'GET /value-events': { status: 200, body: [1, 2, 3, 4] },
      'GET /proposals/p/lineage?depth=1': { status: 200, body: { depth: 1 } },
      'GET /proposals/p/lineage?depth=16': { status: 200, body: { depth: 16 } },
      'POST /receipts/sha256:aa/verify': { status: 200, body: { valid: true } },
    },
  };

  it('answers an exact recorded call, query included', () => {
    expect(resolveReplay(s, 'GET', '/proposals/p/lineage?depth=16').body).toEqual({ depth: 16 });
    expect(resolveReplay(s, 'GET', '/proposals/p/lineage?depth=1').body).toEqual({ depth: 1 });
  });

  it('falls back to the path without query and honours ?limit= on lists', () => {
    expect(resolveReplay(s, 'GET', '/value-events?limit=2')).toEqual({ status: 200, body: [1, 2] });
    expect(resolveReplay(s, 'get', '/value-events')).toEqual({ status: 200, body: [1, 2, 3, 4] });
  });

  it('replays only the recorded pure verification POSTs', () => {
    expect(resolveReplay(s, 'POST', '/receipts/sha256:aa/verify')).toEqual({ status: 200, body: { valid: true } });
  });

  it('refuses every write with 405 READ_ONLY_REPLAY', () => {
    for (const [m, p] of [
      ['POST', '/proposals/p/approve'],
      ['POST', '/proposals/p/execute'],
      ['POST', '/value-events/x/distribute'],
      ['POST', '/dead-letters/d/requeue'],
      ['PUT', '/demo/chaos'],
      ['DELETE', '/demo/chaos'],
      ['POST', '/value-events'],
      ['POST', '/receipts/sha256:bb/verify'],
    ]) {
      const r = resolveReplay(s, m, p);
      expect(r.status, `${m} ${p}`).toBe(405);
      expect((r.body as { error: string }).error).toBe(READ_ONLY_REPLAY);
    }
  });

  it('answers 404 NOT_IN_REPLAY for a read it did not record', () => {
    const r = resolveReplay(s, 'GET', '/wallets');
    expect(r.status).toBe(404);
    expect((r.body as { error: string }).error).toBe(NOT_IN_REPLAY);
  });
});

describe('public replay — the committed snapshot', () => {
  const text = JSON.stringify(snapshot);

  it('is a devnet recording with dated runs', () => {
    expect(snapshot.meta.format).toBe('cryptobot-public-replay/v1');
    expect(snapshot.meta.network).toBe('devnet');
    expect(snapshot.meta.runs.length).toBeGreaterThan(0);
    for (const r of snapshot.meta.runs) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('carries nothing a visitor must not see (tracker ids, internal hosts, tenants, host paths, tokens, keys)', () => {
    const hits = PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
    expect(hits).toEqual([]);
  });

  it('the hygiene patterns do catch what they are for', () => {
    const must = ['KAN-123', 'http://localhost:8091', 'le-uat-cryptobot', 'Chizzini', '/home/sebas/x', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0', '"password": "x"', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'];
    for (const m of must) expect(PATTERNS.some(([, re]) => re.test(m)), m).toBe(true);
  });

  it('records no write: the only non-GET entries are the pure verify calls', () => {
    for (const k of Object.keys(snapshot.responses)) {
      if (!k.startsWith('GET ')) expect(k).toMatch(/^POST \/(receipts|anchors)\/sha256:[0-9a-f]{64}\/verify$/);
    }
  });

  it('every explorer link points to devnet', () => {
    const links = text.match(/https:\/\/explorer\.solana\.com\/[^"]+/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toContain('cluster=devnet');
  });

  it('has the executed operation and an anchored, finalized ValueEvent', () => {
    const proposals = body<{ id: string; status: string }[]>('GET /proposals');
    expect(proposals.map((p) => p.status)).toEqual(['EXECUTED']);
    const events = body<{ id: string; status: string; anchorStatus: string; anchor: { txSignature: string } }[]>('GET /value-events');
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.status).toBe('ANCHORED');
      expect(e.anchorStatus).toBe('FINALIZED');
      expect(e.anchor.txSignature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/);
    }
  });
});

describe('public replay — Merkle proofs folded here agree with the service', () => {
  it('each anchored receipt the service verified folds to its anchor root (and the verdicts match)', async () => {
    const verifies = Object.entries(snapshot.responses).filter(([k]) => /^POST \/receipts\/.+\/verify$/.test(k));
    expect(verifies.length).toBeGreaterThan(0);
    let folded = 0;
    for (const [k, e] of verifies) {
      const v = e.body as { receiptHash: string; anchor?: { anchored?: boolean; root?: string; proof?: string[]; proofValid?: boolean } };
      if (!v.anchor?.anchored || !v.anchor.root || !v.anchor.proof) continue;
      const root = await rootFromProof(v.receiptHash, v.anchor.proof, nodeSha);
      expect(root === v.anchor.root, k).toBe(v.anchor.proofValid === true);
      expect(v.anchor.proofValid, k).toBe(true);
      folded++;
    }
    expect(folded).toBeGreaterThan(0);
  });

  it('every member listed under an anchor folds to that anchor root', async () => {
    const details = Object.entries(snapshot.responses).filter(([k]) => /^GET \/anchors\/sha256:/.test(k));
    let members = 0;
    for (const [k, e] of details) {
      const d = e.body as { anchor: { root: string }; myReceipts?: { receiptHash: string; proof: string[] }[] };
      for (const m of d.myReceipts ?? []) {
        expect(await rootFromProof(m.receiptHash, m.proof, nodeSha), `${k} ${m.receiptHash}`).toBe(d.anchor.root);
        members++;
      }
    }
    expect(members).toBeGreaterThan(0);
  });

  it('the ValueEvent page check (browserProofCheck) reaches the same verdict as the service', async () => {
    const events = body<{ id: string; anchor: { root: string } }[]>('GET /value-events');
    for (const ev of events) {
      const p = body<ValueProof>(`GET /value-events/${encodeURIComponent(ev.id)}/proof`);
      const check = await browserProofCheck(p, ev.anchor.root, nodeSha);
      expect(check.valid).toBe(true);
      expect(check.computedRoot).toBe(ev.anchor.root);
      expect(check.valid).toBe(p.verified);
    }
  });

  it('a tampered receipt or another root is caught', async () => {
    const ev = body<{ id: string; anchor: { root: string } }[]>('GET /value-events')[0];
    const p = body<ValueProof>(`GET /value-events/${encodeURIComponent(ev.id)}/proof`);
    const tampered = { ...p, receiptHash: 'sha256:' + '0'.repeat(64) } as ValueProof;
    expect((await browserProofCheck(tampered, ev.anchor.root, nodeSha)).valid).toBe(false);
    expect((await browserProofCheck(p, 'sha256:' + 'f'.repeat(64), nodeSha)).valid).toBe(false);
    expect((await browserProofCheck(p, ev.anchor.root, null)).valid).toBeNull();
  });
});

describe('public replay — banner dates', () => {
  it('formats one day, a range in one month, and a range across months', () => {
    expect(formatRunDates([{ label: 'a', date: '2026-10-04' }])).toBe('4 Oct 2026');
    expect(formatRunDates([{ label: 'a', date: '2026-10-04' }, { label: 'b', date: '2026-10-03' }])).toBe('3–4 Oct 2026');
    expect(formatRunDates([{ label: 'a', date: '2026-09-30' }, { label: 'b', date: '2026-10-03' }])).toBe('30 Sep 2026 – 3 Oct 2026');
    expect(formatRunDates([])).toBe('');
  });
});
