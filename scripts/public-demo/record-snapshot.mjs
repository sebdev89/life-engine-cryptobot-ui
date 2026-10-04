#!/usr/bin/env node
// record-snapshot.mjs — records the public replay (src/app/public-demo/snapshot.json) from a
// real CryptoBot demo stack that already ran on Solana devnet. Read-only against the stack: it
// only issues GETs, plus the two pure verification POSTs the UI shows (receipt and anchor
// verify), which compute and write nothing. It moves no SOL and sends no transaction.
//
//   node scripts/public-demo/record-snapshot.mjs \
//     --exec-base  http://127.0.0.1:8091   # stack that holds the executed operation
//     --value-base http://127.0.0.1:8291   # stack that holds the ValueEvent (may be the same)
//     --proposal   <proposal uuid>         # the operation shown in /live and /tower
//     --token-file <file>                  # operator JWT of the demo stack (never printed)
//     --run "label|ISO date" [--run …]     # what the banner says was recorded
//     [--out src/app/public-demo/snapshot.json]
//
// The recording is filtered to the chosen proposal and to the ValueEvents of the value stack,
// and it is REFUSED (exit 1, nothing written) if any response matches a pattern of
// src/app/public-demo/hygiene-patterns.json: internal tracker ids, loopback or internal hosts,
// other tenants, host paths, tokens, keys. Anchor members that belong to other operations are
// kept only when they are clean; otherwise they are left out and listed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = { runs: [], out: resolve(ROOT, 'src/app/public-demo/snapshot.json') };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const v = () => args[++i];
  if (a === '--help' || a === '-h') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 21).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  }
  else if (a === '--exec-base') opt.exec = v();
  else if (a === '--value-base') opt.value = v();
  else if (a === '--proposal') opt.proposal = v();
  else if (a === '--token-file') opt.tokenFile = v();
  else if (a === '--run') opt.runs.push(v());
  else if (a === '--out') opt.out = resolve(v());
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}
for (const k of ['exec', 'value', 'proposal', 'tokenFile']) {
  if (!opt[k]) { console.error(`missing --${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`); process.exit(2); }
}
if (!opt.runs.length) { console.error('at least one --run "label|date"'); process.exit(2); }

const token = readFileSync(opt.tokenFile, 'utf8').trim();
const PATTERNS = Object.entries(JSON.parse(readFileSync(resolve(ROOT, 'src/app/public-demo/hygiene-patterns.json'), 'utf8')).patterns)
  .map(([name, src]) => [name, new RegExp(src, 'i')]);

/** names of the patterns a text matches (never the matched text: it could be a secret) */
function hygieneHits(text) {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

const responses = {};
const skipped = [];

async function call(base, method, path) {
  const res = await fetch(`${base.replace(/\/$/, '')}/api/cryptobot${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

/** record a call; `strict` = a hygiene hit aborts the whole recording */
async function record(base, method, path, { strict = true, transform } = {}) {
  const r = await call(base, method, path);
  if (r.status >= 500 || r.status === 401 || r.status === 403) {
    throw new Error(`${method} ${path} → ${r.status}: the stack is not answering as a recording source`);
  }
  if (transform && r.status < 300) r.body = transform(r.body);
  const hits = hygieneHits(JSON.stringify(r.body));
  if (hits.length) {
    if (strict) throw new Error(`${method} ${path} matches [${hits.join(', ')}] — not recorded`);
    skipped.push(`${method} ${path} [${hits.join(', ')}]`);
    return null;
  }
  responses[`${method} ${path}`] = r;
  return r.body;
}

const P = opt.proposal;
const isP = (x) => x && (x.id === P || x.proposalId === P);

// ── the operation (exec stack) ──────────────────────────────────────────────────────────────
await record(opt.exec, 'GET', '/proposals', { transform: (l) => l.filter(isP) });
await record(opt.exec, 'GET', `/proposals/${P}`);
await record(opt.exec, 'GET', `/proposals/${P}/events`);
const receipts = await record(opt.exec, 'GET', `/proposals/${P}/receipts`);
await record(opt.exec, 'GET', `/proposals/${P}/lineage?depth=1`);
await record(opt.exec, 'GET', `/proposals/${P}/lineage?depth=16`);
const onlyP = (page) => (Array.isArray(page) ? page.filter(isP) : { ...page, deadLetters: (page.deadLetters ?? []).filter(isP) });
await record(opt.exec, 'GET', '/dead-letters', { transform: onlyP });

const execRoots = new Set(receipts.map((r) => r.anchor?.root).filter(Boolean));
const anchorsExec = (await call(opt.exec, 'GET', '/anchors?limit=100')).body.filter((a) => execRoots.has(a.anchor.root));
const anchorsValue = (await call(opt.value, 'GET', '/anchors?limit=100')).body;

const receiptHashes = new Map(); // hash → { base, strict }
for (const r of receipts) receiptHashes.set(r.receiptHash, { base: opt.exec, strict: true });

for (const [base, list] of [[opt.exec, anchorsExec], [opt.value, anchorsValue]]) {
  for (const a of list) {
    const root = a.anchor.root;
    const detail = await record(base, 'GET', `/anchors/${root}`);
    await record(base, 'POST', `/anchors/${root}/verify`);
    for (const m of detail?.myReceipts ?? []) {
      const h = typeof m === 'string' ? m : m.receiptHash;
      if (h && !receiptHashes.has(h)) receiptHashes.set(h, { base, strict: false });
    }
  }
}
const allAnchors = [...anchorsExec, ...anchorsValue].sort((x, y) => String(y.anchor.createdAt).localeCompare(String(x.anchor.createdAt)));
const anchorHits = hygieneHits(JSON.stringify(allAnchors));
if (anchorHits.length) throw new Error(`/anchors matches [${anchorHits.join(', ')}]`);
responses['GET /anchors'] = { status: 200, body: allAnchors };

for (const [h, { base, strict }] of receiptHashes) {
  const ok = await record(base, 'GET', `/receipts/${h}`, { strict });
  if (ok) await record(base, 'POST', `/receipts/${h}/verify`, { strict });
}

// ── Proof of Value (value stack) ────────────────────────────────────────────────────────────
const events = await record(opt.value, 'GET', '/value-events');
for (const e of events) {
  const id = encodeURIComponent(e.id);
  await record(opt.value, 'GET', `/value-events/${id}`);
  await record(opt.value, 'GET', `/value-events/${id}/proof`);
  const d = await call(opt.value, 'GET', `/value-events/${id}/distribution`);
  if (d.status === 200) await record(opt.value, 'GET', `/value-events/${id}/distribution`);
}
const revenue = await record(opt.value, 'GET', '/revenue-events');
for (const r of revenue) await record(opt.value, 'GET', `/revenue-events/${encodeURIComponent(r.id)}`);
const identities = await record(opt.value, 'GET', '/identities');
for (const i of identities) {
  const id = encodeURIComponent(i.id);
  await record(opt.value, 'GET', `/identities/${id}`);
  const t = await call(opt.value, 'GET', `/treasury/${id}`);
  if (t.status === 200) await record(opt.value, 'GET', `/treasury/${id}`);
}
for (const g of ['identity', 'asset', 'project']) await record(opt.value, 'GET', `/units/ledger?groupBy=${g}`);
const assets = await record(opt.value, 'GET', '/knowledge-assets');
for (const k of assets) await record(opt.value, 'GET', `/knowledge-assets/${encodeURIComponent(k.id)}`);

const snapshot = {
  meta: {
    format: 'cryptobot-public-replay/v1',
    network: 'devnet',
    recordedAt: new Date().toISOString(),
    runs: opt.runs.map((r) => { const [label, date] = r.split('|'); return { label, date }; }),
  },
  responses: Object.fromEntries(Object.entries(responses).sort(([a], [b]) => a.localeCompare(b))),
};
const out = JSON.stringify(snapshot, null, 1) + '\n';
const final = hygieneHits(out);
if (final.length) { console.error(`snapshot matches [${final.join(', ')}] — not written`); process.exit(1); }
writeFileSync(opt.out, out);
console.log(`snapshot: ${Object.keys(responses).length} responses, ${(out.length / 1024).toFixed(0)} KiB → ${opt.out}`);
if (skipped.length) console.log(`left out (not clean, outside the chosen operation):\n  ${skipped.join('\n  ')}`);
