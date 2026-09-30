import { describe, expect, it } from 'vitest';
import { ActionProposal, PolicyDecision } from '../control-plane-api';
import {
  CORE_RULES,
  PRICE_RULES,
  SIGNER_RULES,
  assetsTouched,
  buildRules,
  countStates,
  inputFacts,
  pickProposal,
  predicateRows,
  ruleState,
  timelockRow,
  timelockSeconds,
} from './policies-model';

// The policy record of proposal e1b6d569 in cryptobot-demo-main (2026-09-30): ALLOW / AUTONOMOUS,
// 20 rules applied (TIMELOCK_ELAPSED is checked at execute, not recorded), no violation.
const APPLIED = [
  'ASSET_ALLOWLIST', 'MAX_TRADE_USD', 'MAX_TRADE_PCT_OF_PORTFOLIO', 'COOLDOWN', 'PRICE_QUORUM', 'PRICE_STALE', 'PRICE_DEVIATION',
  'PRICE_CIRCUIT_BREAKER', 'PRICE_DRIFT', 'AUTHORIZATION', 'EXECUTION_ENABLED', 'EXECUTION_CLUSTER', 'REBALANCE_VAULT_CONFIGURED',
  'MAX_LAMPORTS_PER_TX', 'ONCHAIN_SIMULATION_PASSED', 'SIGNER_CONTROLS_WALLET', 'SIGNER_DESTINATION_ALLOWLISTED', 'SIGNER_MAX_LAMPORTS',
  'SIGNER_CLUSTER', 'VALIDATOR_AVAILABLE',
];

function policy(over: Partial<PolicyDecision> = {}): PolicyDecision {
  return {
    allowed: true,
    executable: true,
    violations: [],
    executionViolations: [],
    rulesApplied: APPLIED,
    evaluatedAt: '2026-09-30T03:42:46.475Z',
    authorization: {
      decision: 'ALLOW',
      escalation: 'NONE',
      tier: 'AUTONOMOUS',
      failedPredicates: [],
      evaluatedPredicates: ['POLICY_BOUND', 'ASSET_ALLOWED', 'TRADE_WITHIN_MAX', 'DAILY_LIMIT', 'ASSET_CONCENTRATION', 'SLIPPAGE_WITHIN_MAX', 'ORACLE_FRESH', 'AGENT_PERMITTED', 'STRATEGY_ENABLED', 'NONCE_UNUSED', 'NOT_EXPIRED'],
      policyVersion: 'cryptobot-policy-v1',
      policyHash: 'sha256:1882cd0a',
      inputHash: 'sha256:e50a30b6',
    },
    input: { intent: { asset: 'SOL', tradeValueCents: 6279 }, state: { agentPermitted: true } },
    ...over,
  };
}

function proposal(over: Partial<ActionProposal> = {}): ActionProposal {
  return {
    id: 'p1',
    status: 'EXECUTED',
    policy: policy(),
    approval: { decision: 'APPROVED', by: 'demo', at: '2026-09-30T03:42:46.513Z', note: null, executableAt: '2026-09-30T03:42:46.513Z' },
    plan: { legs: [{ action: 'SELL', symbol: 'SOL', mint: null, amount: 1, estimatedUsd: 62.79, weightPctBefore: 100, weightPctAfter: 60, counterAsset: 'USDC' }] },
    ...over,
  } as ActionProposal;
}

const NOW = Date.parse('2026-09-30T04:00:00Z');

describe('rule catalogue', () => {
  it('has the 13 core rules of PolicyEngine plus 5 price and 3 signer rules, no duplicates', () => {
    expect(CORE_RULES).toHaveLength(13);
    expect(PRICE_RULES).toHaveLength(5);
    expect(SIGNER_RULES).toHaveLength(3);
    const ids = [...CORE_RULES, ...PRICE_RULES, ...SIGNER_RULES].map((r) => r.id);
    expect(new Set(ids).size).toBe(21);
    // Every rule the service recorded is known to the page.
    for (const id of APPLIED) expect(ids).toContain(id);
  });
});

describe('ruleState', () => {
  it('passes an applied rule without violation and fails one with its messages', () => {
    const p = policy({ allowed: false, violations: [{ rule: 'COOLDOWN', message: 'This wallet executed a trade 12s ago; cooldown is 60s' }] });
    expect(ruleState(p, 'MAX_TRADE_USD')).toEqual({ state: 'PASS', messages: [] });
    expect(ruleState(p, 'COOLDOWN')).toEqual({ state: 'FAIL', messages: ['This wallet executed a trade 12s ago; cooldown is 60s'] });
  });

  it('reads execution violations too, and says NOT_EVALUATED when the rule was not applied or there is no record', () => {
    const p = policy({ executable: false, executionViolations: [{ rule: 'SIGNER_CONTROLS_WALLET', message: 'read-only wallet' }], rulesApplied: ['ASSET_ALLOWLIST'] });
    expect(ruleState(p, 'SIGNER_CONTROLS_WALLET').state).toBe('FAIL');
    expect(ruleState(p, 'VALIDATOR_AVAILABLE').state).toBe('NOT_EVALUATED');
    expect(ruleState(null, 'COOLDOWN').state).toBe('NOT_EVALUATED');
  });
});

describe('timelockRow', () => {
  it('passes once execute was accepted, is pending before executableAt, and not evaluated without approval', () => {
    expect(timelockRow(proposal(), NOW).state).toBe('PASS');
    const future = { decision: 'APPROVED' as const, by: 'x', at: '2026-09-30T03:59:00Z', note: null, executableAt: '2026-09-30T04:00:30Z' };
    expect(timelockRow({ status: 'APPROVED', approval: future }, NOW)).toEqual({ state: 'PENDING', detail: 'executable at 2026-09-30T04:00:30Z (30 s left)' });
    expect(timelockRow({ status: 'AWAITING_APPROVAL', approval: null }, NOW).state).toBe('NOT_EVALUATED');
  });
});

describe('buildRules + countStates', () => {
  it('gives the 13 core rules a state for the demo proposal: all PASS', () => {
    const rows = buildRules(CORE_RULES, proposal(), NOW);
    expect(rows).toHaveLength(13);
    expect(countStates(rows)).toEqual({ PASS: 13, FAIL: 0, PENDING: 0, NOT_EVALUATED: 0 });
  });

  it('counts a blocked proposal', () => {
    const p = proposal({ status: 'BLOCKED_BY_POLICY', approval: null, policy: policy({ allowed: false, violations: [{ rule: 'COOLDOWN', message: 'm' }] }) });
    expect(countStates(buildRules(CORE_RULES, p, NOW))).toEqual({ PASS: 11, FAIL: 1, PENDING: 0, NOT_EVALUATED: 1 });
  });
});

describe('predicates, assets, timelock, input', () => {
  it('marks failed and evaluated predicates', () => {
    const v = { ...policy().authorization!, decision: 'DENY' as const, failedPredicates: ['DAILY_LIMIT'] };
    const rows = predicateRows(v);
    expect(rows).toHaveLength(11);
    expect(rows.find((r) => r.id === 'DAILY_LIMIT')!.state).toBe('FAIL');
    expect(rows.find((r) => r.id === 'NONCE_UNUSED')!.state).toBe('PASS');
    expect(predicateRows(null).every((r) => r.state === 'NOT_EVALUATED')).toBe(true);
  });

  it('lists the assets the plan touches and the timelock in seconds', () => {
    expect(assetsTouched(proposal())).toEqual(['SOL', 'USDC']);
    expect(timelockSeconds(proposal())).toBe(0);
    expect(timelockSeconds({ approval: { decision: 'APPROVED', by: 'x', at: '2026-09-30T03:00:00Z', note: null, executableAt: '2026-09-30T03:02:00Z' } })).toBe(120);
    expect(timelockSeconds({ approval: null })).toBeNull();
  });

  it('flattens (I, S)', () => {
    expect(inputFacts(policy().input)).toEqual([
      { group: 'intent', key: 'asset', value: 'SOL' },
      { group: 'intent', key: 'tradeValueCents', value: '6279' },
      { group: 'state', key: 'agentPermitted', value: 'true' },
    ]);
  });

  it('opens on the wanted proposal, else the newest with a policy record', () => {
    const a = proposal({ id: 'a', policy: null });
    const b = proposal({ id: 'b' });
    expect(pickProposal([a, b], null)!.id).toBe('b');
    expect(pickProposal([a, b], 'a')!.id).toBe('a');
    expect(pickProposal([], null)).toBeNull();
  });
});
