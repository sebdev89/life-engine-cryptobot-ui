/**
 * PUBLIC_DEMO — the read-only public replay build (`ng build --configuration public-demo`).
 *
 * The value is fixed at BUILD time by the `define` of angular.json (`__PUBLIC_DEMO__`), never by
 * runtime config: a visitor cannot turn the operator UI on by editing `config.js` or a query
 * string. In the default build `__PUBLIC_DEMO__` is `false`, the minifier drops every
 * `if (PUBLIC_DEMO)` branch and the snapshot is never loaded; in the public build the operator
 * screens are dropped the same way (scripts/public-demo/check-dist.mjs prunes their orphan chunks).
 *
 * In the public build:
 *   - no request leaves the browser for an API: `apiFetch` answers from a versioned snapshot of a
 *     real devnet run (replay.ts), and refuses every write (405 READ_ONLY_REPLAY);
 *   - the operator routes (/console, /demo, /recovery) do not exist (app.routes.ts);
 *   - the action buttons (approve, execute, requeue, chaos, distribute) are not rendered;
 *   - no session is read from the URL or stored: there is nothing to sign in to.
 */
declare const __PUBLIC_DEMO__: boolean | undefined;

export const PUBLIC_DEMO: boolean = typeof __PUBLIC_DEMO__ !== 'undefined' && __PUBLIC_DEMO__ === true;

/** Routes that operate the system. They are not part of the public build at all. */
export const OPERATOR_ONLY_PATHS: ReadonlySet<string> = new Set(['console', 'demo', 'recovery']);
