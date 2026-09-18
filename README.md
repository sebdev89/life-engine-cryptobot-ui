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
- Lineage layout (`layoutLineage`: parents strictly above children, longest-path
  layering, no overlaps, one path per edge, deterministic) and the receipt
  formatting helpers (KAN-393).

## Glossary

`src/app/glossary/` is a slide-over drawer (button **📖 Glosario** in the
header, plus a link on the login card) with the Spanish CryptoBot glossary:
~860 Solana / DeFi / cryptography / bots-and-agents terms, searchable and
filterable by category. Data lives in `glossary-data.ts`; to add a term, append
an entry to the closest thematic block with one of the existing categories.

## Lineage panel (KAN-393)

`src/app/lineage/` renders, under the selected proposal, the **provenance DAG**
of its decision receipts from `GET /api/cryptobot/proposals/{id}/lineage`
(`lineage-api.ts` mirrors the service records). Each node shows the receipt
kind, its reproducibility level (`L0` signed / `L1` deterministic), the short
hash, what produced it (model ref or engine@version) and ⚓ when it is anchored
on Solana; edges are typed — dashed teal `reuses`, purple `validates`, orange
`executes`, grey derives-from. The header sums measured compute (tokens, units),
cost only when the service priced it, anchored count and reuse count; a
`truncated` flag says the depth cap cut the walk. Clicking a node loads the
stored receipt (parents with roles, inputs, prompt commitment) and calls
`POST /receipts/{hash}/verify` live, one line per check (hash, body, signature,
parents, L1 re-execution). Nothing is computed client-side except the layout;
the SVG is plain — no graph library.

## Phase 2 (deferred)

- Reverse-proxy onto a shared origin so token-in-query-string isn't needed.
- Persist review history (a per-user / per-symbol panel).
- Add a "rerun" affordance that calls back into `cryptobot-service`.
- Move the SCSS into a shared `@lifeengine/ui-core` library so colors stay in
  sync with `life-engine-runtime-ui`.
