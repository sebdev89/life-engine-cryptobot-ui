#!/usr/bin/env node
// receipt-cards.mjs — draws the shareable card of every ValueEvent in the committed snapshot into
// public/cards/<id>.png (1200×630, the link preview of /value/<id>). Every value on the card comes from
// the snapshot; nothing is typed in. Run it after re-recording the snapshot (needs a local Chrome):
//
//   node scripts/public-demo/receipt-cards.mjs [--chrome /usr/bin/google-chrome]
//
// og-pages.mjs (run in the image build) then gives /value/<id> its own Open Graph tags pointing here,
// and fails if a ValueEvent has no card.
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const chrome = args.includes('--chrome') ? args[args.indexOf('--chrome') + 1] : undefined;
const snap = JSON.parse(readFileSync(join(ROOT, 'src/app/public-demo/snapshot.json'), 'utf8'));
const mark = readFileSync(join(ROOT, 'public/brand/cryptobot-mark.svg'), 'utf8');
const events = snap.responses['GET /value-events'].body;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mid = (h, a = 10, b = 10) => { const p = h.startsWith('sha256:') ? 'sha256:' : ''; const x = h.slice(p.length); return x.length > a + b + 1 ? `${p}${x.slice(0, a)}…${x.slice(-b)}` : h; };
const sol = (l) => (l / 1e9).toFixed(4);

function card(ev) {
  const d = snap.responses[`GET /value-events/${ev.id}/distribution`]?.body ?? null;
  const paid = d ? d.payouts.filter((p) => p.status === 'CONFIRMED') : [];
  const people = [...new Map(ev.contributions.map((c) => [c.identityId, c])).values()];
  const stages = ['MERGED', 'BUILT', 'DEPLOYED', 'RUNNING', 'ACCEPTED'].filter((s) => ev.acceptance?.stages?.[s] === true);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#060a12;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#e8edf3}
.bg{position:absolute;inset:0;background:radial-gradient(700px 420px at 0% 0%,rgba(157,140,255,.26),transparent 62%),radial-gradient(800px 460px at 100% 110%,rgba(62,230,176,.16),transparent 60%)}
.w{position:relative;padding:56px 64px}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:12px;font-weight:700;font-size:24px}.brand svg{width:40px;height:40px}
.tag{padding:7px 14px;border-radius:999px;border:1px solid rgba(62,230,176,.5);color:#3ee6b0;font-size:17px;font-weight:600;background:rgba(62,230,176,.08)}
.k{margin:38px 0 6px;color:#98a4b3;font-size:20px}
h1{margin:0 0 26px;font-size:50px;line-height:1.08;letter-spacing:-.03em;max-width:24ch}
.g{display:grid;grid-template-columns:repeat(4,auto);gap:10px 48px;justify-content:start}
.g b{display:block;font-size:44px;letter-spacing:-.02em}.g span{color:#98a4b3;font-size:17px}
.foot{position:absolute;left:64px;right:64px;bottom:48px;display:flex;justify-content:space-between;align-items:flex-end;font-size:18px;color:#b8c2cf}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace}
.seal{display:flex;align-items:center;gap:10px;color:#3ee6b0;font-weight:600}
.st{color:#98a4b3}
</style></head><body><div class="bg"></div><div class="w">
<div class="top"><div class="brand">${mark.replace(/<\?xml[^>]*>/, '')}CryptoBot · Proof of Value</div><div class="tag">Solana devnet · ${ev.anchorStatus === 'FINALIZED' ? 'finalized' : esc(ev.anchorStatus?.toLowerCase())}</div></div>
<p class="k">Accepted outcome</p>
<h1>${esc(ev.title)}</h1>
<div class="g">
<div><b>${ev.totalUnits}</b><span>Contribution Units</span></div>
<div><b>${people.length}</b><span>contributors</span></div>
${d ? `<div><b>${sol(paid.reduce((a, p) => a + p.lamports, 0))}</b><span>SOL paid · ${paid.length} wallets</span></div>` : ''}
<div><b>${stages.length}/5</b><span>acceptance stages${ev.acceptance?.source === 'manual' ? ' · declared' : ''}</span></div>
</div>
</div>
<div class="foot"><div><div class="seal">✓ Merkle root anchored · slot ${ev.anchor?.slot?.toLocaleString('en-US') ?? '—'}</div><div class="mono">${esc(mid(ev.anchor?.root ?? ''))}</div></div>
<div class="st">Replay of a real devnet run · read-only</div></div>
</body></html>`;
}

mkdirSync(join(ROOT, 'public/cards'), { recursive: true });
const b = await chromium.launch(chrome ? { executablePath: chrome } : {});
const page = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
for (const ev of events) {
  if (ev.status !== 'ANCHORED') continue;
  const html = join(mkdtempSync(join(tmpdir(), 'card-')), 'card.html');
  writeFileSync(html, card(ev));
  await page.goto(`file://${html}`, { waitUntil: 'load' });
  const out = join(ROOT, 'public/cards', `${ev.id}.png`);
  await page.screenshot({ path: out });
  console.log(`card: ${out}`);
}
await b.close();
