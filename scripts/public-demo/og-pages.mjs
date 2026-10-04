#!/usr/bin/env node
// og-pages.mjs — gives each anchored ValueEvent of the snapshot its own link preview. For every event it
// writes <dist>/value/<id>.html: the same index.html, with the Open Graph / Twitter tags pointing at the
// event (title, one line, cards/<id>.png). nginx serves it for /cryptobot/value/<id> (try_files $uri.html)
// and the SPA boots exactly as from index.html. Fails if an event has no card (receipt-cards.mjs).
//
//   node scripts/public-demo/og-pages.mjs dist/cryptobot-ui-public-demo/browser
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(process.argv[2] ?? join(ROOT, 'dist/cryptobot-ui-public-demo/browser'));
const ORIGIN = 'https://life-engine.app/cryptobot/';
const snap = JSON.parse(readFileSync(join(ROOT, 'src/app/public-demo/snapshot.json'), 'utf8'));
const index = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const setMeta = (html, attr, key, value) => {
  const re = new RegExp(`(<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`index.html has no <meta ${attr}="${key}">`);
  return html.replace(re, `$1${esc(value)}$2`);
};

let n = 0;
const failures = [];
for (const ev of snap.responses['GET /value-events'].body) {
  if (ev.status !== 'ANCHORED') continue;
  const card = `cards/${ev.id}.png`;
  if (!existsSync(join(dist, card))) {
    failures.push(`no card for ValueEvent ${ev.id} (run scripts/public-demo/receipt-cards.mjs)`);
    continue;
  }
  const title = `${ev.title} · Proof of Value`;
  const line = `${ev.totalUnits} Contribution Units across ${ev.contributions.length} contributions, anchored on Solana devnet in slot ${ev.anchor?.slot ?? '—'}. Verify it yourself.`;
  let html = index;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', line);
  html = setMeta(html, 'property', 'og:url', `${ORIGIN}value/${ev.id}`);
  html = setMeta(html, 'property', 'og:image', `${ORIGIN}${card}`);
  html = setMeta(html, 'property', 'og:image:alt', `Receipt card: ${ev.title}`);
  html = setMeta(html, 'name', 'description', line);
  mkdirSync(join(dist, 'value'), { recursive: true });
  writeFileSync(join(dist, 'value', `${ev.id}.html`), html);
  n++;
}
if (failures.length) {
  console.error(`og-pages: FAIL\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`og-pages: ${n} ValueEvent page(s) with their own link preview`);
