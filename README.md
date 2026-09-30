<!-- Product name: defined only in the title below; change it there. -->
# Proof of Value — CryptoBot, the first economic agent · UI

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
