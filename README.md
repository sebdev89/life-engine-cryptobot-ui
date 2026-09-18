# cryptobot-ui

Vertical Angular app for the **CryptoBot market review** screen of the first
happy path (`docs/extraction/first-happy-path-plan.md` in the workspace root).

Minimal Phase-1 surface:

- Single screen `app.html` with a symbol input (default `BTCUSDT`) and a
  "Run market review" button.
- Calls `POST :8091/api/cryptobot/market-review`, then opens an SSE stream
  against `:8090/api/runtime/runs/{runId}/stream` and renders the event
  timeline in line with what `life-engine-runtime-ui` shows.
- Token bootstrap matches `life-engine-runtime-ui`: open this app with
  `?token=<jwt>&refresh=<refresh>&exp=<unixSeconds>` from `life-engine-auth-ui`;
  the query is consumed once and persisted into
  `localStorage["life-engine-cryptobot.session"]`.

## Local

```bash
npm install
npm start -- --port 4203
```

Then open `http://localhost:4203/?token=<accessToken>` (or paste the token
manually into localStorage under `life-engine-cryptobot.session`).

## Tests

```bash
npm test
```

Covers:

- API error parsing + formatter.
- `postMarketReview` sends/omits `Authorization` depending on session state.
- `runtimeSseUrl` appends `?access_token=` only when a session is present.
- Glossary data sanity (no empty/duplicate terms, known categories) and the
  accent-insensitive search/ranking in `filterGlossary`.
- Receipts panel helpers (KAN-394): the explorer link rule (`?cluster=devnet`
  only on devnet), the anchor label, short hashes and the pipeline order.

## Glossary

`src/app/glossary/` is a slide-over drawer (button **📖 Glosario** in the
header, plus a link on the login card) with the Spanish CryptoBot glossary:
~860 Solana / DeFi / cryptography / bots-and-agents terms, searchable and
filterable by category. Data lives in `glossary-data.ts`; to add a term, append
an entry to the closest thematic block with one of the existing categories.

## Decision receipts and their devnet anchor (KAN-394)

`src/app/receipts/` (`<app-receipts>`, under the proposal detail) lists the signed
receipts of the selected proposal — or the wallet's latest when none is selected —
with step, hash, key, reproducibility level and **anchor**: a receipt that is in a
finalized batch shows `anchored · devnet · slot N`, the Merkle root and a link to
the memo transaction on the Solana explorer (`https://explorer.solana.com/tx/<sig>?cluster=devnet`);
one that is not yet says so. **Verify** calls `POST /api/cryptobot/receipts/{hash}/verify`
and shows each server-side check (hash · body · signature · parents) plus whether the
stored Merkle proof still folds to the root in that transaction. Types and pure helpers
live in `receipts-api.ts`; nothing is computed in the UI beyond display.

## Phase 2 (deferred)

- Reverse-proxy onto a shared origin so token-in-query-string isn't needed.
- Persist review history (a per-user / per-symbol panel).
- Add a "rerun" affordance that calls back into `cryptobot-service`.
- Move the SCSS into a shared `@lifeengine/ui-core` library so colors stay in
  sync with `life-engine-runtime-ui`.
