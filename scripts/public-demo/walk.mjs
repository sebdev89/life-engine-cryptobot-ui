#!/usr/bin/env node
// walk.mjs — walks the public replay as a visitor would, in a fresh headless browser (no profile,
// no cookies = incognito), and fails (exit 1) unless:
//   · every request the pages make stays on the page's own origin under /cryptobot/ — no API, no
//     backend, no third party (the replay answers from its bundled snapshot). The ONE exception is the
//     public Solana devnet RPC, and only as a read: "Verify it yourself" (clicked here on the ValueEvent
//     page) sends one JSON-RPC `getTransaction`; any other method or host fails the walk;
//   · no request to the page's own origin is a write (only GET/HEAD);
//   · the operator routes (/console, /demo, /recovery) are not served (they fall back to the overview);
//   · no action button is rendered (Approve, Reject, Execute, Requeue, Resolve, Arm, Distribute, Use token);
//   · the ValueEvent page says "Proof check: verified" AND "Checked in this browser: … the same root
//     written on Solana", and links to Solana Explorer on devnet;
//   · no JS error, and no horizontal scroll at 390 px.
// With --explorer it also opens the ValueEvent's anchor on Solana Explorer and waits for "Finalized";
// with --github it opens the source link.
//
//   node scripts/public-demo/walk.mjs --url http://127.0.0.1:8080/cryptobot/ [--shots DIR] [--prefix pd-]
//        [--host-rules "MAP uat.life-engine.app:80 127.0.0.1:18080"] [--explorer] [--github] [--chrome /usr/bin/google-chrome]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = get('--url');
if (!base || !base.endsWith('/cryptobot/')) { console.error('--url must end in /cryptobot/'); process.exit(2); }
const shots = get('--shots');
const prefix = get('--prefix', 'pd-');
const hostRules = get('--host-rules');
const chrome = get('--chrome');
const withExplorer = args.includes('--explorer');
const withGithub = args.includes('--github');
if (shots) mkdirSync(shots, { recursive: true });

const origin = new URL(base).origin;
const DEVNET_RPC = 'https://api.devnet.solana.com/';
const RPC_READS = new Set(['getTransaction']);
const failures = [];
const requests = [];
const devnetReads = [];
const fail = (m) => failures.push(m);

const browser = await chromium.launch({
  headless: true,
  ...(chrome ? { executablePath: chrome } : {}),
  args: hostRules ? [`--host-resolver-rules=${hostRules}`] : [],
});
const ACTIONS = /^(Approve|Reject|Cancel|Execute on devnet|Requeue|Resolve|Confirm|Arm|Disarm|Distribute immediate reward|Use token|Sign in|Log in)$/i;

async function visit(ctx, path, { width }) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => {
    const u = r.url();
    requests.push(`${r.method()} ${u}`);
    if (u === DEVNET_RPC || u === DEVNET_RPC.slice(0, -1)) {
      let m = null;
      try { m = JSON.parse(r.postData() ?? '{}').method; } catch { /* not JSON */ }
      if (r.method() === 'POST' && RPC_READS.has(m)) { devnetReads.push(m); return; }
      if (r.method() === 'OPTIONS') return;
      fail(`${path}: devnet RPC call that is not a read: ${r.method()} ${m}`);
      return;
    }
    if (!u.startsWith(`${origin}/cryptobot/`) && !u.startsWith('data:')) fail(`${path}: request outside the page: ${r.method()} ${u}`);
    if (!['GET', 'HEAD'].includes(r.method())) fail(`${path}: write request ${r.method()} ${u}`);
    if (/\/api\//.test(new URL(u).pathname)) fail(`${path}: API request ${u}`);
  });
  const res = await page.goto(base + path, { waitUntil: 'networkidle' });
  if (!res || res.status() !== 200) fail(`${path}: HTTP ${res?.status()}`);
  await page.waitForTimeout(600);
  const buttons = await page.$$eval('button', (bs) => bs.filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()));
  for (const b of buttons) if (ACTIONS.test(b)) fail(`${path}: action button rendered: "${b}"`);
  if (await page.locator('input[type=password]').count()) fail(`${path}: a credential field is rendered`);
  const banner = await page.locator('app-replay-banner').innerText().catch(() => '');
  if (!/Replay of a real Solana devnet run/.test(banner) || !/read-only/.test(banner)) fail(`${path}: replay banner missing`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (width <= 400 && overflow > 1) fail(`${path} @${width}px: horizontal scroll (${overflow}px)`);
  for (const e of errors) fail(`${path}: JS error: ${e.slice(0, 160)}`);
  return page;
}

const results = {};
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 400 ? 900 : 844 }, deviceScaleFactor: 1 });
  // overview → value list → first ValueEvent
  const home = await visit(ctx, '', { width });
  if (shots) await home.screenshot({ path: join(shots, `${prefix}overview-${width}.png`), fullPage: false });
  const value = await visit(ctx, 'value', { width });
  const href = await value.locator('a[href*="/cryptobot/value/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')).find((h) => /\/value\/[0-9a-f-]{36}$/.test(h)));
  if (!href) fail('value: no link to a ValueEvent');
  const evPath = href ? href.replace(/^.*\/cryptobot\//, '') : 'value';
  const ev = await visit(ctx, evPath, { width });
  await ev.locator('[data-testid=browser-proof]').waitFor({ timeout: 10000 }).catch(() => fail(`${evPath}: no in-browser proof check rendered`));
  const proofText = await ev.locator('[data-testid=proof]').innerText().catch(() => '');
  const browserText = await ev.locator('[data-testid=browser-proof]').innerText().catch(() => '');
  if (!/Proof check: verified/.test(proofText)) fail(`${evPath}: service proof not "verified" (${proofText})`);
  if (!/the same root written on Solana/.test(browserText)) fail(`${evPath}: in-browser fold did not match (${browserText})`);
  const explorer = await ev.locator('a[href*="explorer.solana.com/tx/"]').first().getAttribute('href').catch(() => null);
  if (!explorer || !/cluster=devnet/.test(explorer)) fail(`${evPath}: no devnet explorer link`);
  // "Verify it yourself": the one live read against devnet. MATCH, or the explicit recorded fallback.
  await ev.locator('[data-testid=verify-devnet]').click().catch(() => fail(`${evPath}: no "Verify on Solana devnet" button`));
  const verdict = await ev.locator('[data-testid=devnet-verdict]').innerText({ timeout: 15000 }).catch(() => '');
  if (!/^Match\b/.test(verdict) && !/RPC unavailable — showing recorded result/.test(verdict)) fail(`${evPath}: devnet check gave neither a match nor the recorded fallback (${verdict})`);
  if (/No match|No anchor memo/.test(verdict)) fail(`${evPath}: devnet says the root does not match (${verdict})`);
  results.devnetVerdict = verdict.replace(/\s+/g, ' ').slice(0, 160);
  results.valueEvent = evPath; results.explorer = explorer; results.proofText = proofText; results.browserProof = browserText.replace(/\s+/g, ' ');
  if (shots) {
    await ev.locator('[data-section=solana]').scrollIntoViewIfNeeded().catch(() => {});
    await ev.screenshot({ path: join(shots, `${prefix}value-event-${width}.png`), fullPage: false });
  }
  // guided replay: nine steps, deep link, keyboard
  const tour = await visit(ctx, 'tour?step=3', { width });
  const t3 = await tour.locator('[data-testid=tour-step]').getAttribute('data-step').catch(() => null);
  if (t3 !== '3') fail(`tour?step=3: shows step ${t3}`);
  await tour.keyboard.press('ArrowRight');
  await tour.waitForTimeout(300);
  const t4 = await tour.locator('[data-testid=tour-step]').getAttribute('data-step').catch(() => null);
  if (t4 !== '4' || !/[?&]step=4\b/.test(tour.url())) fail(`tour: → did not move to step 4 (${t4}, ${tour.url()})`);
  if (shots) await tour.screenshot({ path: join(shots, `${prefix}tour-${width}.png`), fullPage: false });
  await tour.close();
  for (const p of ['live', 'tower', 'proof', 'policies', 'value/identities', 'value/identities/dev-agent-17', 'value/ledger', 'value/revenue', 'value/treasury']) {
    const pg = await visit(ctx, p, { width });
    if (shots && ['live', 'tower', 'proof', 'value/identities/dev-agent-17'].includes(p)) {
      await pg.screenshot({ path: join(shots, `${prefix}${p.replace(/\//g, '-')}-${width}.png`), fullPage: false });
    }
    await pg.close();
  }
  // operator routes: not served — the SPA falls back to the overview
  for (const p of ['console', 'demo', 'recovery']) {
    const pg = await visit(ctx, p, { width });
    const at = new URL(pg.url()).pathname;
    if (at !== '/cryptobot/') fail(`${p}: operator route still served (landed on ${at})`);
    if ((await pg.locator('h2:has-text("Actions"), h2:has-text("Chaos"), app-token-gate').count()) > 0) fail(`${p}: operator UI rendered`);
    await pg.close();
  }
  await ctx.close();
}

if (withExplorer && results.explorer) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await pg.goto(results.explorer, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => fail(`explorer: ${e.message}`));
  const ok = await pg.getByText(/finalized/i).first().waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
  results.explorerFinalized = ok;
  if (!ok) fail('explorer: "Finalized" not shown');
  if (shots) await pg.screenshot({ path: join(shots, `${prefix}explorer-1280.png`) });
  await ctx.close();
}
if (withGithub) {
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const res = await pg.goto('https://github.com/sebdev89/life-engine-cryptobot-service', { waitUntil: 'domcontentloaded' });
  results.github = res?.status();
  if (res?.status() !== 200) fail(`github: HTTP ${res?.status()}`);
  await ctx.close();
}
await browser.close();

const offPage = requests.filter((r) => !r.split(' ')[1].startsWith(`${origin}/cryptobot/`) && !r.split(' ')[1].startsWith(DEVNET_RPC.slice(0, -1)));
const report = { base, requests: requests.length, offPageRequests: offPage.length, devnetReads: devnetReads.length, apiRequests: requests.filter((r) => /\/api\//.test(r)).length, writes: requests.filter((r) => !/^(GET|HEAD) /.test(r) && !r.includes(DEVNET_RPC.slice(0, -1))).length, ...results, failures };
if (shots) writeFileSync(join(shots, `${prefix}walk.json`), JSON.stringify({ ...report, requestList: [...new Set(requests)] }, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
