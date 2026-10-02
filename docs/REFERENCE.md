# cryptobot-ui — technical reference

> Per-screen implementation notes. The overview is the [README](../README.md).

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
  formatting helpers.
- Receipts panel helpers: the explorer link rule (`?cluster=devnet`
  only on devnet), the anchor label, short hashes and the pipeline order.
- Live operation: timeline model and component, see below.

## Live operation — the hackathon demo path

`/live[/:proposalId]` (`src/app/live/`) shows the demo path of
`Products/CryptoBot-Hackathon-Demo-Path-2026-09-20.md` §2 as one screen, without a console.
The root is now a router shell (`app.ts` → `<router-outlet>`); the dashboard lives in
`src/app/dashboard/` and is served at `/console` since the landing moved, plus a **● Operación en vivo** link in its header. The live
route is lazy, so the dashboard's initial bundle does not pay for it.

What it shows, and where each piece comes from (nothing is computed client-side beyond the
mapping; every button hits an endpoint that already exists in `cryptobot-service` main):

| Section | Source |
|---|---|
| Timeline of the 12 steps (intent → simulation → policy → approval → timelock → preconditions/mainnet gate → validator → signer → submit → confirmation → reconciliation/DLQ → EXECUTION receipt) with `done / active / failed / uncertain / skipped` | `GET /proposals/{id}` (status + `audit` trail) and `/receipts`; `live-model.ts#buildTimeline` maps event types to steps — `EXECUTION_BROADCAST_UNCERTAIN` and `RECONCILIATION_AMBIGUOUS` render as *uncertain* because the service itself said it does not know |
| Live updates | **polling every 2 s** (`getProposal` + `/events`, the DLQ and the chaos state); the service exposes no SSE for proposals. Paused when the tab is hidden; a Pause button; lineage + receipts reload only when the row moved (`status`/`updatedAt`) |
| Actions: Approve · Reject · Cancel (inside the timelock) · Execute on devnet | the same `POST /proposals/{id}/…` the dashboard uses. Execute sends a per-proposal `operationId` in the body (idempotency; the `Idempotency-Key` header is not in the service's CORS allow-list) — the second click returns the same tx. **Execute is enabled on any APPROVED row, even when the policy says not executable: the 409 the control plane answers (`CONFLICT` / `MAINNET_DISABLED`) is shown in "last answer", because that fail-closed refusal is part of the demo** |
| Risk + policy | `policy` of the proposal: allowed/executable, the deterministic verdict (`decision`, `tier`, `escalation`, `R_v` hash, input hash, evaluated/failed predicates) and every applied rule as pass / blocked / not-executable with its message; a banner when the wallet is on mainnet or `EXECUTION_CLUSTER` fired |
| Signature and chain | `execution`: signature with the explorer link the service stored (or `?cluster=devnet` for devnet), signer, confirmation, `lastValidBlockHeight`, reconciliation attempts, and after an idempotent retry the superseded `previousSignature` |
| Receipts + lineage | `<app-receipts>` and `<app-lineage>` reused as-is: `verify` and the DAG |
| Durable events | `GET /proposals/{id}/events`: outbox rows with delivery state and the proposal's dead letters |
| Dead-letter queue | `GET /dead-letters?resolved=all` (RUNTIME_ADMIN — a 403 shows a one-line note instead of failing the page); open letters with **Requeue** / **Resolve** behind an inline confirmation + optional note (`POST /dead-letters/{id}/requeue|resolve`); the resolution (outcome, reconciliation result, proposal state) is shown and the view jumps to the proposal it touched |
| Chaos (demo only) | rendered **only when `GET /demo/chaos` answers 200** (the bean exists only with `cryptobot.chaos.enabled=true`; 404/403/network ⇒ hidden). Arm a mode (`rpc-down` / `uncertain` / `confirm-timeout`) with a shot count, Disarm, and the injected faults log |

Local: `npm start -- --port 4204` (the demo compose allows that origin) with the UI pointed at
the demo stack (`public/config.js` → `cryptobotBase`), sign in with Auth or paste a token as
above, open `/live`. Tests: `live-model.spec.ts` (the timeline against the audit sequences of
the real devnet runs of 2026-09-20 — happy path, chaos `rpc-down` → DLQ → requeue → retry,
blocked/rejected/cancelled/validator refusal, policy rows, the mainnet flag, error flattening)
and `live.spec.ts` (the component against a fake `fetch`: 12 steps rendered, chaos hidden on
404 / shown on 200, DLQ 403, requeue confirmation + note, execute with a stable `operationId`
and the 409 shown, explorer link, redirect to login without a session).

## Demo Mode

`/demo` runs the trusted execution with one click, against whatever stack `config.js` points to, using
only routes the UI already consumes (`src/app/demo/demo-runner.ts`, the same sequence as
`scripts/demo/e2e-devnet.sh`): wallet (reused; registered if the operator has none) → `POST
/wallets/{w}/proposals` → `approve` → timelock countdown (`approval.executableAt`) → `execute` with
`operationId` in the body → poll `GET /proposals/{id}` to `EXECUTED` → EXECUTION receipt + `verify` →
`POST /anchors?wait=true` → inclusion proof → `POST /anchors/{root}/verify` → **VERIFIED**. The 8-stage
pipeline is the `/live` component fed by the run. Waits the service imposes are shown, not hidden: the
policy `COOLDOWN` (60 s by default after an execution; the blocked intent stays in the history) is read
from the violation message and counted down before the intent is created again.

**Scenario B · SIMULATE FAILURE**, the order of `e2e-devnet.sh --chaos rpc-down`: same intent →
approve → timelock, then `PUT /demo/chaos {"broadcast":"rpc-down","shots":-1}` → `execute` (signed, the
broadcast is lost: `EXECUTION_BROADCAST_UNCERTAIN`) → the reconciler gets no verdict and dead-letters
(`GET /dead-letters?proposalId=`; 3 attempts × interval + grace ≈ 90 s with the defaults, shown as it
happens) → `DELETE /demo/chaos` → `POST /dead-letters/{id}/requeue` → a second requeue, whose **409** is shown
as *IDEMPOTENCY CHECK: duplicate prevented* → the retry lands under the **same `operationId`** with a new
signature (`previousSignature` = attempt 1) → receipt/anchor/verify as in A. The fault is always disarmed on
the way out, also when the run fails. Needs `cryptobot.chaos.enabled=true` and a RUNTIME_ADMIN token.

Open it with a demo token: `scripts/demo/ui-url.sh --path /demo` (cryptobot-service repo). `config.js`
may carry `demoWallet` (`UI_DEMO_WALLET` in the container); otherwise the page asks for the address once.

## Control Tower

`/tower` — KPIs counted in the browser every 5 s from `GET /proposals?limit=100`, `GET /dead-letters?resolved=all&limit=500`
and `GET /anchors?limit=200` (the API clamps), and the latest 10 executions with their current stage of the 8, read from
`GET /proposals/{id}` + `/proposals/{id}/receipts` + `GET /anchors/{root}` only when a row changed.

| KPI | counted as |
|---|---|
| executions | proposals with `operationId` (execute attempted) |
| finalized | `status = EXECUTED` |
| recovered | EXECUTED proposals that have a dead letter |
| DLQ open | `open` of the dead-letter page (system-wide) |
| retries | sum of `execution.retries` (same operationId) |
| proofs | `FINALIZED` anchor batches (system-wide) and their `receiptCount` |
| latency | mean of `execution.confirmedAt − createdAt` over EXECUTED (approval and timelock included) |

A source that answers 403 (dead letters need RUNTIME_ADMIN) shows `—` with the reason, never 0. "Duplicate prevented" is not
shown: the service counts it only in Prometheus (`duplicate_trade_suppressed_total`), no endpoint or audit event carries it.
Without a session the page asks for a token instead of failing.

## Proof view

`/proof` lists the anchor batches (`GET /anchors?limit=50`: root, status, receipts, slot, memo tx). `/proof/:root[?receipt=]` reads
`GET /anchors/{root}` (the batch and the caller's members with their siblings), folds the chosen member to the root in the
browser (`merkle.proofPath`: leaf, every `L`/`R` sibling and the node it produced) and, on **Verify on server**, shows
`POST /anchors/{root}/verify` check by check (`rootMatches`, `countMatches`, `proofsValid`, `memoMatches`, `onChain.found`, `valid`).
PROVE in `/live/:id` and the result of `/demo` link here with the EXECUTION receipt preselected; so does the proof column of `/tower`.

## Landing and navigation

`/` is the public landing (no session, no API call, eager in the main bundle): hero, the problem in three lines, the
8-stage strip, the failure scene in one line and two CTAs — **Watch Trusted Execution** → `/demo`, **Open Control Tower** →
`/tower`. `/?token=` is consumed like on any route (`main.ts` → `session.ts`), so the CTA reaches `/demo` signed in; without a
token `/demo` (and `/tower`, `/proof`) ask for one in a field (`app-token-gate`). The operator dashboard moved to `/console`
(lazy); every screen shares `app-top-nav` (Control Tower · Execution · Proof · Demo Mode · Console). The logo is
`public/brand/cryptobot-mark.svg` (mark A, chosen 2026-10-02; mark B discarded), copied from `cryptobot-service/docs/brand/`.

## Recovery

`/recovery` is the dead-letter queue: what the reconciler refused to guess about. It reads
`GET /dead-letters?resolved=all` (global, RUNTIME_ADMIN) and `GET /proposals` (this operator) every 5 s:
counts (open · requeued · resolved · recovered · mean time to decision), one row per letter (state, kind,
reason, proposal and its status, reconciliation attempts / retries, timestamps, decision and note) with
**Requeue** / **Resolve** on open letters (`POST /dead-letters/{id}/requeue|resolve`, a 403 is shown as
"needs RUNTIME_ADMIN"), the recoveries (decided letter → proposal EXECUTED, links to `/live/:id` and
`/proof`) and, marked *demo only*, the fault injection (`GET|PUT|DELETE /demo/chaos`; hidden text when
the endpoint answers 404/403). A letter whose proposal belongs to another operator shows "other
operator" instead of a guessed status. Model: `recovery/recovery-model.ts` (+ spec).

## Policies

`/policies` shows the policy a proposal was decided under, read from `GET /proposals/{id}` (no policy
endpoint): verdict (ALLOW / DENY / ESCALATE, tier, escalation), `R_v`, `H_R` and `H(I,S)`; the **13 core
rules** of `PolicyEngine` with their state (pass · fail with the service's message · pending · not
evaluated) and one line each; autonomy tiers with the current one; asset allowlist with the oracle
sources; timelock (approval → executableAt); the 11 predicates with the expression they evaluate; the
5 price-integrity rules with the oracle limits; the 3 signer caps; and the `(I, S)` facts.
`TIMELOCK_ELAPSED` is not in the recorded decision (the service checks it at execute), so its state
comes from the approval and whether execute was accepted. `?proposal=<id>` selects one; default is the
newest proposal with a policy record. Model: `policies/policies-model.ts` (+ spec).

## Responsive, polish and navigation

One header on every screen (`shell/top-nav.ts`, `NAV_LINKS` in the judge's order: Control Tower →
Execution → Proof → Recovery → Policies → Demo Mode, then Console). Above 900 px the links sit in one
row; at or below 900 px the header is one line (brand + **Menu**) and the links open as a panel
(`aria-expanded`, Esc closes). Every route has its own tab title (`app.routes.ts`, tested). Shared
screen states live in `styles.scss` (`.banner-err`, `.loading`); `--text-3` was raised to 5.4:1 on the
page background; `prefers-reduced-motion` turns animations off globally. The `/live` copy is in English
like the rest of the walk. The favicon is `public/brand/cryptobot-mark.svg`.

## Glossary

`src/app/glossary/` is a slide-over drawer (button **📖 Glosario** in the
header, plus a link on the login card) with the Spanish CryptoBot glossary:
~860 Solana / DeFi / cryptography / bots-and-agents terms, searchable and
filterable by category. Data lives in `glossary-data.ts`; to add a term, append
an entry to the closest thematic block with one of the existing categories.

## Lineage panel

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

## Decision receipts and their devnet anchor

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
