<!-- Product name: defined only in the title below; change it there. -->
# CryptoBot — Proof of Value for Autonomous Agents · UI

<p align="center"><img src="public/brand/cryptobot-mark.svg" alt="CryptoBot mark" width="96"></p>

The operator and demo UI (Angular) of Proof of Value and of CryptoBot's Trusted Agent Execution. It only reads and calls the
service API ([`life-engine-cryptobot-service`](https://github.com/sebdev89/life-engine-cryptobot-service)); nothing is computed
client-side beyond presentation, and the only Merkle work in the browser is folding an inclusion proof to check it.

> **AI can create value. Proof of Value makes sure we remember who created it.**
> Don't reward commits. Reward outcomes. · Software should remember who created its value.

## Screens

| Route | What it shows |
|---|---|
| `/value` | Accepted outcomes (ValueEvents): status RECORDED → ANCHORED, units, reward and revenue KPIs, devnet explorer link |
| `/value/:id` | One outcome: task, the five acceptance stages, contributors and roles, knowledge assets, compute (cost ≠ value), why it was split this way, immediate distribution with one tx per wallet, future participation, Solana anchor and proof |
| `/value/identities` · `/value/identities/:id` | Humans and agents: kind, wallet (explorer link), owner/operator, reputation (accepted outcomes, units), rewards received, history |
| `/value/ledger` | Contribution Units by identity, knowledge asset or project; totals add up to the units distributed |
| `/value/revenue` · `/value/revenue/:id` | RevenueEvents: source (a CryptoBot proposal or simulated, always labelled), 20 % contributor pool / 5 % fee / retained, historical distribution with payouts |
| `/value/treasury` | Treasury read model of `cryptobot-001`: on-chain balance, income, payouts, fee, compute cost, retained, policies, recent events |
| `/live` · `/live/:proposalId` | One trusted execution live: intent → policy → approval → timelock → validator → signer → Solana → reconciliation → receipt |
| `/demo` | Demo Mode: the trusted execution in one click, and the simulated failure → dead letter → idempotent retry |
| `/tower` | Control Tower: KPIs counted from the API and the latest executions with their phase |
| `/proof` · `/proof/:root` | Merkle anchors on devnet, the inclusion path folded in the browser, server verification |
| `/recovery` · `/policies` · `/console` | Dead-letter queue and its human decisions · the rules a proposal was decided under · the operator console |
| `/` | Landing |

Copy that is fixed on purpose: "devnet SOL stands in for stablecoin settlement in this demo" and "Contribution Units are an
attribution primitive, not equity and not a promise of return".

## Public replay (read-only, no backend)

**https://life-engine.app/cryptobot/** is this UI built with `--configuration public-demo`: a replay of a real CryptoBot
run on Solana devnet that anyone can open without signing in, and that cannot change anything.

- **No backend.** Every API read is answered from [`src/app/public-demo/snapshot.json`](src/app/public-demo/snapshot.json),
  a versioned recording of the run (the operation executed on 3 Oct 2026 and the ValueEvent anchored on 4 Oct 2026). The
  page makes no request outside its own `/cryptobot/` files; the CSP (`connect-src 'self'`) enforces it in the browser.
- **Read-only by construction.** The flag is fixed at build time (`define: __PUBLIC_DEMO__`), not by runtime config. The
  operator screens (`/console`, `/demo`, `/recovery`) are not routes and their code is not shipped; action buttons
  (approve, execute, requeue, chaos, distribute) are not rendered; any write the code could still attempt is refused locally
  with `405 READ_ONLY_REPLAY`. There is no sign-in and nothing is stored in the browser.
- **Verifiable, not just displayed.** `/value/:id` shows the service's proof verdict *and* folds the Merkle path in the
  browser (WebCrypto, same scheme as the service), then links the anchor transaction on Solana Explorer (devnet).

```bash
npx ng build --configuration public-demo && node scripts/public-demo/check-dist.mjs --prune   # bundle hygiene gate
docker build -f docker/public-demo/Dockerfile -t cryptobot-public-demo .                       # what is deployed
docker run --rm --read-only --tmpfs /tmp -p 8080:8080 cryptobot-public-demo                    # → :8080/cryptobot/
node scripts/public-demo/walk.mjs --url http://127.0.0.1:8080/cryptobot/                       # browser walk
```

Re-recording the snapshot (read-only against a demo stack; it refuses to write a snapshot that carries internal ids,
loopback or internal hosts, host paths, tokens or keys): `node scripts/public-demo/record-snapshot.mjs --help`.

## Run it against the demo stack

The demo stack lives in the service repo and builds this UI as its `ui` profile. With both repos side by side
(`cryptobot-service/` and `cryptobot-ui/` in the same folder; otherwise set `CRYPTOBOT_UI_CONTEXT` to this checkout):

```bash
cd ../cryptobot-service
scripts/demo/wallet-devnet.sh && scripts/demo/run.sh --keep          # keys, .env.demo, stack up on devnet
docker compose -f docker-compose.demo.yml --env-file .env.demo --profile ui up -d --build
scripts/demo/pov-e2e.sh --task "Improve CryptoBot opportunity detection" --task-id TASK-042 --assume-accepted --skip-op
scripts/demo/ui-url.sh --path /value                                   # prints a signed-in URL (1 h demo token)
```

The demo stack has no login service: `ui-url.sh` mints a short-lived demo token and the UI consumes `?token=` once. The UI is
published on port 4204, the origin the service's CORS admits.

For development against the same stack: `npm ci && npm start -- --port 4204`, with `public/config.js` → `cryptobotBase`
pointing at the service (default `http://localhost:8091`), then open the URL `ui-url.sh` prints.

## Tests

```bash
npm test          # Angular unit tests (Vitest)
npx ng build      # production build
npx ng build --configuration public-demo && node scripts/public-demo/check-dist.mjs --prune
```

## Screenshots

Captured against a live devnet stack and stored in `docs/screenshots/` (see the capture section below).

## More

Per-screen implementation notes: [`docs/REFERENCE.md`](docs/REFERENCE.md). Architecture, what is real today on devnet (with
explorer links), limitations and roadmap: the service README.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE). Copyright (c) 2026 Sebastian H. De Vito. See [`NOTICE`](NOTICE) for contributors.

## Screenshots de Proof of Value

Captura manual (no corre en CI ni en `npm test`) de las pantallas `/value*`, `/live/:id` y `/proof/:root` contra un stack vivo:

```bash
npx playwright install chromium          # una vez
UI_URL=http://127.0.0.1:4204 UI_TOKEN=<jwt> npm run screenshots
```

`UI_TOKEN` sólo por entorno (nunca en el repo; en el demo se acuña con `scripts/demo/ui-url.sh` de cryptobot-service). Elige los ids reales desde la API
(último ValueEvent ANCHORED con distribución y revenue, último proposal, su root). Salida: `docs/screenshots/*.{desktop,mobile}.png` (1440×900 y 390×844,
página completa, paleta PNG8 si pasa de 300 KB). Opcionales: `API_URL`, `OUT_DIR`, `DUMP_DIR` (texto visible por página), `UI_DIST=dist/cryptobot-ui/browser`
(sirve un build local bajo el origen de `UI_URL`, para probar un cambio sin mergear contra el backend real).
