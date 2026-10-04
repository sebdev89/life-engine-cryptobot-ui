#!/usr/bin/env node
// check-dist.mjs — gate of the public replay build, run after `ng build --configuration public-demo`
// (and inside the image build). Fails (exit 1) unless the bundle a visitor downloads is clean:
//
//   1. reachability: starting at index.html, follow every `import("./chunk-…")` / `from"./chunk-…"`;
//      with --prune, chunks nobody can load (the operator screens esbuild still emits as orphans)
//      are DELETED, so they are not even served;
//   2. no operator screen is reachable: the titles of /console, /demo and /recovery are absent;
//   3. hygiene: no served text file matches src/app/public-demo/hygiene-patterns.json
//      (internal tracker ids, loopback/internal hosts, other tenants, host paths, tokens, keys);
//   4. no backend URL: no `http(s)://` origin in the JS other than the allowlisted public ones
//      (Solana Explorer, GitHub, the W3C/Angular namespaces the framework carries, and the public
//      Solana devnet RPC — the one read the "Verify it yourself" check makes, see devnet-verify.ts).
//
//   node scripts/public-demo/check-dist.mjs [--prune] [dist/cryptobot-ui-public-demo/browser]
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const prune = args.includes('--prune');
const dist = resolve(args.find((a) => !a.startsWith('--')) ?? join(ROOT, 'dist/cryptobot-ui-public-demo/browser'));
const PATTERNS = Object.entries(JSON.parse(readFileSync(join(ROOT, 'src/app/public-demo/hygiene-patterns.json'), 'utf8')).patterns)
  .map(([name, src]) => [name, new RegExp(src, 'i')]);
const ORIGIN_ALLOW = [
  /^https:\/\/explorer\.solana\.com/,
  /^https:\/\/github\.com\/sebdev89\/life-engine-cryptobot-(service|ui)/,
  /^https?:\/\/www\.w3\.org\//,
  /^https:\/\/angular\.dev/,
  /^https:\/\/g\.co\/ng\//,
  /^https:\/\/solana\.com/,
  /^https:\/\/faucet\.solana\.com/,
  /^https:\/\/api\.devnet\.solana\.com$/,
];
const OPERATOR_TITLES = ['Console · CryptoBot', 'Demo Mode · CryptoBot', 'Recovery · CryptoBot'];

const failures = [];
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dist);

// 1. reachability
const index = readFileSync(join(dist, 'index.html'), 'utf8');
const reach = new Set();
const queue = [...index.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => join(dist, m[1]));
while (queue.length) {
  const f = queue.pop();
  if (reach.has(f)) continue;
  reach.add(f);
  if (!f.endsWith('.js')) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/["'`]\.\/(chunk-[A-Z0-9]+\.js)["'`]/g)) queue.push(join(dirname(f), m[1]));
}
const orphans = files.filter((f) => /\/chunk-[A-Z0-9]+\.js$/.test(f) && !reach.has(f));
if (orphans.length) {
  if (prune) {
    for (const f of orphans) unlinkSync(f);
    console.log(`pruned ${orphans.length} unreachable chunk(s): ${orphans.map((f) => relative(dist, f)).join(' ')}`);
  } else {
    failures.push(`unreachable chunks are served (run with --prune): ${orphans.map((f) => relative(dist, f)).join(' ')}`);
  }
}
const served = prune ? files.filter((f) => !orphans.includes(f)) : files;

// 2–4. content
for (const f of served) {
  if (!/\.(js|mjs|css|html|json|txt|svg|map)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  const rel = relative(dist, f);
  for (const [name, re] of PATTERNS) if (re.test(text)) failures.push(`${rel}: matches "${name}"`);
  for (const t of OPERATOR_TITLES) if (text.includes(t)) failures.push(`${rel}: carries the operator screen "${t}"`);
  if (f.endsWith('.js')) {
    for (const m of text.matchAll(/https?:\/\/[A-Za-z0-9.-]+(?::\d+)?[^\s"'`)]*/g)) {
      if (!ORIGIN_ALLOW.some((re) => re.test(m[0]))) failures.push(`${rel}: absolute URL not on the allowlist: ${m[0].slice(0, 80)}`);
    }
  }
}
if (/<script[^>]+src="\/?config\.js"/.test(index)) failures.push('index.html loads config.js (runtime backend config)');
if (!/<base href="\/cryptobot\/"/.test(index)) failures.push('index.html: <base href> is not /cryptobot/');

if (failures.length) {
  console.error(`public-demo dist: FAIL (${failures.length})\n  ${[...new Set(failures)].join('\n  ')}`);
  process.exit(1);
}
console.log(`public-demo dist: PASS — ${served.length} files served, ${reach.size} reachable from index.html, 0 hygiene hits, 0 backend URLs`);
