/**
 * `/policies` (KAN-791): the policy a proposal was decided under, read from the proposal itself
 * (`GET /proposals/{id}` → `policy`, `approval`) — no policy endpoint exists and none is added.
 * Rule ids and their one-line meaning come from the service (`PolicyEngine.RULE_*`, the violation
 * messages it writes, `PolicyPredicate`, `PolicyRules`); the UI only reads which ones were applied
 * and which ones the service recorded as violated.
 */
import { ActionProposal, PolicyDecision, PolicyVerdict } from '../control-plane-api';

export type RuleStage = 'proposal' | 'execution';
export type RuleState = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_EVALUATED';

export interface RuleDef {
  id: string;
  what: string;
  /** proposal = a violation blocks the proposal (BLOCKED_BY_POLICY); execution = it stays a paper trade. */
  stage: RuleStage;
}

/** The 13 core rules (PolicyEngine l.67-83), in declaration order. */
export const CORE_RULES: readonly RuleDef[] = [
  { id: 'EXECUTION_ENABLED', stage: 'execution', what: 'Kill switch: nothing executes while cryptobot.policy.execution-enabled=false (emergency stop).' },
  { id: 'ASSET_ALLOWLIST', stage: 'proposal', what: "Every leg's asset and its counter asset must be in the allowed asset list." },
  { id: 'MAX_TRADE_USD', stage: 'proposal', what: 'The trade notional must not exceed the per-trade USD limit.' },
  { id: 'MAX_TRADE_PCT_OF_PORTFOLIO', stage: 'proposal', what: 'The trade must not move more than the allowed percentage of the portfolio.' },
  { id: 'COOLDOWN', stage: 'proposal', what: 'A wallet that just executed a trade waits out the cooldown before the next one.' },
  { id: 'EXECUTION_CLUSTER', stage: 'execution', what: 'Execution is allowed only on the configured cluster, and the wallet must be on it.' },
  { id: 'MAX_LAMPORTS_PER_TX', stage: 'execution', what: 'The prepared transaction must not move more lamports than the per-transaction cap.' },
  { id: 'REBALANCE_VAULT_CONFIGURED', stage: 'execution', what: 'A valid rebalance vault address is configured, and it differs from the wallet.' },
  { id: 'ONCHAIN_SIMULATION_PASSED', stage: 'execution', what: 'An executable transaction was prepared for the plan and its on-chain simulation passed.' },
  { id: 'SIGNER_CONTROLS_WALLET', stage: 'execution', what: 'The signer service is up and controls this wallet; otherwise it is a paper trade only.' },
  { id: 'AUTHORIZATION', stage: 'proposal', what: 'The deterministic verdict over (I, S, R_v) did not DENY; a denial lists the failed predicates.' },
  { id: 'VALIDATOR_AVAILABLE', stage: 'execution', what: 'An independent validator is reachable and holds exactly the same policy (H_R).' },
  { id: 'TIMELOCK_ELAPSED', stage: 'execution', what: "The approval's timelock (executableAt) has elapsed; execute is refused before it." },
];

/** Price integrity (KAN-439 / KAN-572), in the order they are applied. */
export const PRICE_RULES: readonly RuleDef[] = [
  { id: 'PRICE_QUORUM', stage: 'proposal', what: 'At least min_sources independent, valid, distinct price sources answered for every asset touched.' },
  { id: 'PRICE_STALE', stage: 'proposal', what: 'The quorum was not lost to observations older than max_age.' },
  { id: 'PRICE_DEVIATION', stage: 'proposal', what: 'Every source used is within max_deviation_bps of the median (outliers are refused, not averaged).' },
  { id: 'PRICE_CIRCUIT_BREAKER', stage: 'proposal', what: 'The median did not move more than max_move_bps against the last accepted consensus inside move_interval.' },
  { id: 'PRICE_DRIFT', stage: 'proposal', what: 'The price each leg was planned at is within max_move_bps of the fresh median.' },
];

/** The signer's own hard caps (KAN-572), checked here so the refusal is visible one step earlier. */
export const SIGNER_RULES: readonly RuleDef[] = [
  { id: 'SIGNER_DESTINATION_ALLOWLISTED', stage: 'execution', what: "The transaction's destination is in the signer's allowlist." },
  { id: 'SIGNER_MAX_LAMPORTS', stage: 'execution', what: "The lamports moved are under the signer's own cap." },
  { id: 'SIGNER_CLUSTER', stage: 'execution', what: "The signer is pinned to the wallet's cluster." },
];

/** The predicates of the deterministic engine (`PolicyPredicate`), with the expression it evaluates. */
export const PREDICATES: readonly { id: string; expr: string }[] = [
  { id: 'POLICY_BOUND', expr: 'intent.policy_version == rules.version' },
  { id: 'ASSET_ALLOWED', expr: 'asset in allowed_assets' },
  { id: 'TRADE_WITHIN_MAX', expr: 'trade_value_cents <= max_trade_value_cents' },
  { id: 'DAILY_LIMIT', expr: 'daily_exposure_cents + trade_value_cents <= daily_limit_cents' },
  { id: 'ASSET_CONCENTRATION', expr: 'asset_exposure_after_bps <= max_asset_exposure_bps' },
  { id: 'SLIPPAGE_WITHIN_MAX', expr: 'max_slippage_bps <= rules.max_slippage_bps' },
  { id: 'ORACLE_FRESH', expr: 'oracle_age_seconds <= max_oracle_age_seconds' },
  { id: 'AGENT_PERMITTED', expr: 'agent_permitted == true' },
  { id: 'STRATEGY_ENABLED', expr: 'strategy_id in enabled_strategies' },
  { id: 'NONCE_UNUSED', expr: 'nonce_unused == true' },
  { id: 'NOT_EXPIRED', expr: 'current_slot <= valid_until_slot' },
];

/** Autonomy tiers by trade value (`PolicyRules`, paper §18). */
export const TIERS: readonly { id: PolicyVerdict['tier']; band: string; outcome: string }[] = [
  { id: 'AUTONOMOUS', band: '≤ autonomous_up_to', outcome: 'ALLOW' },
  { id: 'SECOND_AGENT', band: '≤ second_agent_up_to', outcome: 'ESCALATE · REQUIRE_SECOND_AGENT' },
  { id: 'HUMAN_SIGNATURE', band: '≤ max_trade_value', outcome: 'ESCALATE · REQUIRE_HUMAN_SIGNATURE' },
  { id: 'OVER_LIMIT', band: '> max_trade_value', outcome: 'DENY' },
];

export interface RuleRow extends RuleDef {
  state: RuleState;
  messages: string[];
  detail: string | null;
}

/** Statuses in which execute was accepted — the timelock check had already passed. */
const EXECUTE_STARTED = new Set(['EXECUTING', 'SUBMITTED', 'EXECUTED', 'FAILED']);

export function ruleState(policy: PolicyDecision | null | undefined, id: string): { state: RuleState; messages: string[] } {
  if (!policy) return { state: 'NOT_EVALUATED', messages: [] };
  const messages = [...(policy.violations ?? []), ...(policy.executionViolations ?? [])].filter((v) => v.rule === id).map((v) => v.message);
  if (messages.length) return { state: 'FAIL', messages };
  return { state: policy.rulesApplied?.includes(id) ? 'PASS' : 'NOT_EVALUATED', messages: [] };
}

/**
 * TIMELOCK_ELAPSED is not part of the recorded decision: the service checks it when execute is
 * called (a 409 before `executableAt`). So its state comes from the approval and from whether an
 * execute was accepted afterwards — never from the policy record.
 */
export function timelockRow(p: Pick<ActionProposal, 'approval' | 'status'>, now: number): { state: RuleState; detail: string | null } {
  const at = p.approval?.executableAt ?? null;
  if (!p.approval || p.approval.decision !== 'APPROVED' || !at) return { state: 'NOT_EVALUATED', detail: 'checked at execute, after an approval' };
  if (EXECUTE_STARTED.has(p.status)) return { state: 'PASS', detail: `executable at ${at}; execute was accepted` };
  const left = Date.parse(at) - now;
  if (Number.isFinite(left) && left > 0) return { state: 'PENDING', detail: `executable at ${at} (${Math.ceil(left / 1000)} s left)` };
  return { state: 'PASS', detail: `executable since ${at}` };
}

export function buildRules(defs: readonly RuleDef[], p: Pick<ActionProposal, 'policy' | 'approval' | 'status'>, now: number): RuleRow[] {
  return defs.map((d) => {
    if (d.id === 'TIMELOCK_ELAPSED') {
      const t = timelockRow(p, now);
      return { ...d, state: t.state, messages: [], detail: t.detail };
    }
    const r = ruleState(p.policy, d.id);
    return { ...d, state: r.state, messages: r.messages, detail: null };
  });
}

export function countStates(rows: readonly RuleRow[]): Record<RuleState, number> {
  const c: Record<RuleState, number> = { PASS: 0, FAIL: 0, PENDING: 0, NOT_EVALUATED: 0 };
  for (const r of rows) c[r.state]++;
  return c;
}

export function predicateRows(v: PolicyVerdict | null | undefined): { id: string; expr: string; state: RuleState }[] {
  return PREDICATES.map((pr) => ({
    ...pr,
    state: !v ? 'NOT_EVALUATED' : v.failedPredicates.includes(pr.id) ? 'FAIL' : v.evaluatedPredicates.includes(pr.id) ? 'PASS' : 'NOT_EVALUATED',
  }));
}

/** The assets the plan touches (legs and their counter assets), unique, in plan order. */
export function assetsTouched(p: Pick<ActionProposal, 'plan'>): string[] {
  const out: string[] = [];
  for (const l of p.plan?.legs ?? []) {
    for (const a of [l.symbol, l.counterAsset]) if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

/** Seconds between approval and executableAt: the timelock the verdict imposed (0 = none). */
export function timelockSeconds(p: Pick<ActionProposal, 'approval'>): number | null {
  const a = p.approval;
  if (!a?.executableAt) return null;
  const d = Date.parse(a.executableAt) - Date.parse(a.at);
  return Number.isFinite(d) ? Math.max(0, Math.round(d / 1000)) : null;
}

/** The (I, S) facts the verdict was computed over, flattened for a two-column table. */
export function inputFacts(input: Record<string, unknown> | null | undefined): { group: string; key: string; value: string }[] {
  const out: { group: string; key: string; value: string }[] = [];
  for (const group of ['intent', 'state']) {
    const g = input?.[group];
    if (g && typeof g === 'object') {
      for (const [k, v] of Object.entries(g as Record<string, unknown>)) out.push({ group, key: k, value: typeof v === 'string' ? v : JSON.stringify(v) });
    }
  }
  return out;
}

/** The proposal the page opens on: the one asked for, else the newest one that has a policy record. */
export function pickProposal(list: readonly ActionProposal[], wanted: string | null): ActionProposal | null {
  if (wanted) {
    const w = list.find((p) => p.id === wanted);
    if (w) return w;
  }
  return list.find((p) => !!p.policy) ?? list[0] ?? null;
}
