#!/usr/bin/env node
// Manual Playwright capture of the Proof of Value screens against a LIVE stack.
// Not part of CI or `npm test`. The token comes from the environment, never from the repo.
//
//   UI_URL=http://127.0.0.1:4204 UI_TOKEN=<jwt> npm run screenshots
//
// Optional: API_URL (default: the cryptobotBase the UI serves in /config.js, else UI_URL host :8091),
//           OUT_DIR (default docs/screenshots), DUMP_DIR (also write each page's visible text as .txt),
//           UI_DIST=dist/cryptobot-ui/browser  serve a LOCAL build under UI_URL's origin (config.js still comes from UI_URL), to QA
//                                              an unmerged change against the live backend without touching the stack,
//           OPTIMIZE=0 to skip the palette pass (uses ImageMagick `convert` if present; PNG cap 300 KB).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, statSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_URL = (process.env.UI_URL ?? '').replace(/\/$/, '');
const TOKEN = process.env.UI_TOKEN ?? '';
if (!UI_URL || !TOKEN) {
  console.error('UI_URL and UI_TOKEN are required (env). Example: UI_URL=http://127.0.0.1:4204 UI_TOKEN=... npm run screenshots');
  process.exit(2);
}
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(process.env.OUT_DIR ?? join(ROOT, 'docs/screenshots'));
const DUMP_DIR = process.env.DUMP_DIR ? resolve(process.env.DUMP_DIR) : null;
const UI_DIST = process.env.UI_DIST ? resolve(process.env.UI_DIST) : null;
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const MAX_BYTES = 300 * 1024;
const STORAGE_KEY = 'life-engine-cryptobot.session'; // src/app/session.ts
const VIEWPORTS = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];

async function resolveApiBase() {
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  try {
    const js = await (await fetch(`${UI_URL}/config.js`)).text();
    const m = js.match(/cryptobotBase:\s*'([^']+)'/);
    if (m) return m[1].replace(/\/$/, '');
  } catch { /* fall through */ }
  return `${new URL(UI_URL).protocol}//${new URL(UI_URL).hostname}:8091`;
}

const API = `${await resolveApiBase()}/api/cryptobot`;
async function api(path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

// Pick real ids from the live API: latest ANCHORED event with a distribution and a revenue share.
const events = await api('/value-events');
const sorted = [...events].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
const anchored = sorted.filter((e) => e.status === 'ANCHORED');
const ev = anchored.find((e) => e.distribution && e.revenueShares?.length) ?? anchored[0];
if (!ev) throw new Error('no ANCHORED value event on the backend; run the PoV demo first');
const revenueId = ev.revenueShares?.[0]?.revenueEventId;
const proposals = await api('/proposals').catch(() => []);
const plist = Array.isArray(proposals) ? proposals : (proposals.items ?? proposals.content ?? []);
const latest = [...plist].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
const proposalId = latest?.id ?? latest?.proposalId;
const root = ev.anchor?.root;

const pages = [
  ['value', '/value'],
  ['value-detail', `/value/${ev.id}`],
  ['identity-dev-agent-17', '/value/identities/dev-agent-17'],
  ['ledger', '/value/ledger'],
  revenueId && ['revenue-detail', `/value/revenue/${revenueId}`],
  ['treasury', '/value/treasury'],
  proposalId && ['live', `/live/${proposalId}`],
  root && ['proof', `/proof/${encodeURIComponent(root)}`],
].filter(Boolean);

mkdirSync(OUT_DIR, { recursive: true });
if (DUMP_DIR) mkdirSync(DUMP_DIR, { recursive: true });

function optimize(file) {
  if (process.env.OPTIMIZE === '0') return;
  if (statSync(file).size <= MAX_BYTES) return;
  try {
    execFileSync('convert', [file, '-dither', 'None', '-colors', '256', '-define', 'png:compression-level=9', `PNG8:${file}`]);
  } catch { console.warn(`  ! could not optimize ${file} (ImageMagick "convert" missing?)`); }
}

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' });
    await ctx.addInitScript(([key, token]) => {
      try { localStorage.setItem(key, JSON.stringify({ accessToken: token })); } catch { /* ignore */ }
    }, [STORAGE_KEY, TOKEN]);
    if (UI_DIST) {
      await ctx.route(`${UI_URL}/**`, (route) => {
        const { pathname } = new URL(route.request().url());
        if (pathname === '/config.js') return route.continue();
        const asFile = join(UI_DIST, pathname);
        const hit = pathname !== '/' && existsSync(asFile) && statSync(asFile).isFile() ? asFile : join(UI_DIST, 'index.html');
        return route.fulfill({ body: readFileSync(hit), contentType: MIME[extname(hit)] ?? 'application/octet-stream' });
      });
    }
    if (UI_DIST) {
      // Playwright's interception takes over CORS for cross-origin calls; answer them like the backend does for UI_URL's origin.
      const cors = { 'access-control-allow-origin': new URL(UI_URL).origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      await ctx.route(`${new URL(API).origin}/**`, async (route) => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const res = await route.fetch();
        return route.fulfill({ response: res, headers: { ...res.headers(), ...cors } });
      });
    }
    for (const [name, path] of pages) {
      const page = await ctx.newPage();
      if (process.env.DEBUG_REQ) page.on('requestfailed', (r) => console.log('  requestfailed', r.url().replace(/token=[^      await page.goto(`${UI_URL}${path}`]*/, 'token=…'), r.failure()?.errorText));
      await page.goto(`${UI_URL}${path}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('main', { timeout: 15000 });
      await page.waitForTimeout(800); // let the last async panel (proof verify, treasury RPC) settle
      const file = join(OUT_DIR, `${name}.${vp.tag}.png`);
      await page.screenshot({ path: file, fullPage: true });
      optimize(file);
      if (DUMP_DIR) writeFileSync(join(DUMP_DIR, `${name}.${vp.tag}.txt`), await page.evaluate(() => document.body.innerText));
      console.log(`${name}.${vp.tag}.png  ${(statSync(file).size / 1024).toFixed(0)} KB`);
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
