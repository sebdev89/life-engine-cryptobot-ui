/**
 * The guided replay: the nine links of the Proof of Value chain, each backed by values read from the
 * recording (the same API responses every other screen reads). Nothing here is typed in by hand: a
 * value the recording does not carry is left out, and each value says how far it can be trusted
 * (truth chips). The run has two halves on purpose, and the copy says so: one operation the agent
 * executed on Solana (steps 1–5), and the accepted software outcome it runs on, with who created it
 * and who got paid (steps 6–9).
 */
import { ActionProposal, AuditEvent } from '../control-plane-api';
import { Distribution, IdentityProfile, RevenueEvent, ValueEvent } from '../value-events-api';
import { POV_CHAIN } from '../pov/pov-chain';
import type { TruthKind } from '../ui/truth';
import { translate } from '../ui/i18n';
import { ACCEPTANCE_STAGES, lamportsToSol, revenuePolicyView, bpsPercent, explorerAddressUrl, txExplorerUrl } from '../value/value-model';

export interface TourData {
  proposal: ActionProposal | null;
  audit: readonly AuditEvent[];
  event: ValueEvent | null;
  distribution: Distribution | null;
  revenue: RevenueEvent | null;
  identity: IdentityProfile | null;
}

export type Evidence =
  | { kind: 'text'; label: string; value: string; truth: TruthKind; mono?: boolean }
  | { kind: 'hash'; label: string; value: string; truth: TruthKind; href?: string; what: string }
  | { kind: 'time'; label: string; at: string; truth: TruthKind; slot?: number | null }
  | { kind: 'link'; label: string; value: string; href: string; truth: TruthKind }
  | { kind: 'bars'; label: string; rows: { name: string; role: string; units: number; route: string[] }[]; total: number; truth: TruthKind };

export interface TourStep {
  n: number;
  id: string;
  name: string;
  /** what happened, in one sentence */
  line: string;
  /** what this does NOT mean, when the name could suggest more than the recording shows */
  caveat: string | null;
  evidence: Evidence[];
  /** the full screen for this step */
  open: { label: string; route: string[]; fragment?: string } | null;
  /** step 7 carries the live "verify it yourself" check */
  verify: { signature: string; root: string; slot: number | null } | null;
}

const LAMPORTS = 1_000_000_000;

function lastPayload(audit: readonly AuditEvent[], type: string): Record<string, unknown> {
  for (let i = audit.length - 1; i >= 0; i--) if (audit[i].eventType === type) return (audit[i].payload ?? {}) as Record<string, unknown>;
  return {};
}

function str(v: unknown): string | null {
  return v === null || v === undefined || v === '' ? null : String(v);
}

function weights(w: Record<string, number> | null | undefined): string | null {
  if (!w) return null;
  const parts = Object.entries(w).map(([k, v]) => `${k} at ${v} %`);
  return parts.length ? parts.join(', ') : null;
}

function seconds(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 1000) : null;
}

type P = ActionProposal & Record<string, unknown>;

export type Tr = (key: string, params?: Record<string, string | number>) => string;
const EN: Tr = (k, p) => translate('en', k, p);

/** Pure: the nine steps from what the recording holds. Evidence rows with no value are dropped. */
export function buildTour(d: TourData, tr: Tr = EN): TourStep[] {
  const p = d.proposal as P | null;
  const ev = d.event;
  const pid = p?.id ?? null;
  const live = pid ? { label: tr('tour.open.live'), route: ['/live', pid] } : null;
  const valueRoute = ev ? ['/value', ev.id] : null;

  const plan = (p?.['plan'] ?? null) as { summary?: string } | null;
  const tx = (p?.transaction ?? null) as { destination?: string; lamports?: number } | null;
  const sim = (p?.simulation ?? null) as { onchain?: { ok?: boolean; unitsConsumed?: number } } | null;
  const risk = (p?.riskBefore ?? null) as { findings?: { title?: string; severity?: string }[] } | null;
  const policy = (p?.policy ?? null) as {
    rulesApplied?: string[];
    violations?: unknown[];
    authorization?: { decision?: string; tier?: string; policyHash?: string; policyVersion?: string };
  } | null;
  const approval = (p?.approval ?? null) as { at?: string; executableAt?: string; by?: string } | null;
  const exec = (p?.execution ?? null) as {
    signature?: string;
    explorerUrl?: string;
    signerPublicKey?: string;
    confirmationStatus?: string;
    confirmedAt?: string;
  } | null;
  const validated = lastPayload(d.audit, 'EXECUTION_VALIDATED');
  const created = d.audit.find((a) => a.eventType === 'PROPOSAL_CREATED')?.createdAt ?? (p?.['createdAt'] as string | undefined) ?? null;

  const moved = typeof tx?.lamports === 'number' ? `${(tx.lamports / LAMPORTS).toFixed(4)} SOL` : null;
  const timelock = seconds(approval?.at, approval?.executableAt);
  const finding = risk?.findings?.[0];

  const steps: Omit<TourStep, 'n' | 'id' | 'name'>[] = [
    // 1 — Intent
    {
      line: weights(p?.intent?.targetWeights) ? tr('tour.1.line', { w: weights(p?.intent?.targetWeights)! }) : tr('tour.1.line.plain'),
      caveat: null,
      evidence: compact([
        p?.title ? { kind: 'text', label: tr('tour.ev.proposal'), value: p.title, truth: 'recorded' } : null,
        p?.reasoningSummary ? { kind: 'text', label: tr('tour.ev.reason'), value: p.reasoningSummary, truth: 'declared' } : null,
        created ? { kind: 'time', label: tr('tour.ev.created'), at: created, truth: 'recorded' } : null,
      ]),
      open: live,
      verify: null,
    },
    // 2 — Strategist
    {
      line: tr('tour.2.line'),
      caveat: tr('tour.2.caveat'),
      evidence: compact([
        finding?.title ? { kind: 'text', label: tr('tour.ev.risk', { s: (finding.severity ?? '').toLowerCase() }), value: finding.title, truth: 'recorded' } : null,
        moved ? { kind: 'text', label: tr('tour.ev.planned'), value: tr('tour.ev.planned.v', { sol: moved }), truth: 'recorded', mono: false } : null,
        tx?.destination ? { kind: 'hash', label: tr('tour.ev.vault'), value: tx.destination, truth: 'recorded', href: explorerAddressUrl(tx.destination), what: tr('tour.ev.vault') } : null,
        sim?.onchain
          ? { kind: 'text', label: tr('tour.ev.sim'), value: `${tr(sim.onchain.ok ? 'tour.ev.sim.ok' : 'tour.ev.sim.fail')}${typeof sim.onchain.unitsConsumed === 'number' ? ` · ${tr('tour.ev.sim.cu', { n: sim.onchain.unitsConsumed })}` : ''}`, truth: 'recorded' }
          : null,
      ]),
      open: live,
      verify: null,
    },
    // 3 — Guardian
    {
      line: tr('tour.3.line'),
      caveat:
        policy?.authorization?.decision === 'ESCALATE'
          ? tr('tour.3.caveat')
          : null,
      evidence: compact([
        policy?.rulesApplied
          ? { kind: 'text', label: tr('tour.ev.checks'), value: tr('tour.ev.checks.v', { n: policy.rulesApplied.length, v: policy.violations?.length ?? 0 }), truth: 'recorded' }
          : null,
        policy?.authorization?.decision
          ? { kind: 'text', label: tr('tour.ev.verdict'), value: `${policy.authorization.decision}${policy.authorization.tier ? ` · tier ${policy.authorization.tier}` : ''}`, truth: 'recorded', mono: true }
          : null,
        timelock !== null ? { kind: 'text', label: tr('tour.ev.timelock'), value: `${timelock} s`, truth: 'recorded' } : null,
        policy?.authorization?.policyHash ? { kind: 'hash', label: `${tr('tour.ev.policyhash')}${policy.authorization.policyVersion ? ` (${policy.authorization.policyVersion})` : ''}`, value: policy.authorization.policyHash, truth: 'recorded', what: tr('tour.ev.policyhash') } : null,
      ]),
      open: { label: tr('tour.open.policies'), route: ['/policies'] },
      verify: null,
    },
    // 4 — Operator
    {
      line: tr('tour.4.line'),
      caveat: tr('tour.4.caveat'),
      evidence: compact([
        approval?.at ? { kind: 'time', label: tr('tour.ev.approved'), at: approval.at, truth: 'recorded' } : null,
        str(validated['verdictHash']) ? { kind: 'hash', label: tr('tour.ev.verdicthash'), value: String(validated['verdictHash']), truth: 'recorded', what: tr('tour.ev.verdicthash') } : null,
        exec?.signerPublicKey ? { kind: 'hash', label: tr('tour.ev.signer'), value: exec.signerPublicKey, truth: 'recorded', href: explorerAddressUrl(exec.signerPublicKey), what: tr('tour.ev.signer') } : null,
      ]),
      open: live,
      verify: null,
    },
    // 5 — Solana
    {
      line: moved ? tr('tour.5.line', { sol: moved }) : tr('tour.5.line.plain'),
      caveat: tr('tour.5.caveat'),
      evidence: compact([
        exec?.signature ? { kind: 'hash', label: tr('tour.ev.tx'), value: exec.signature, truth: 'onchain', href: exec.explorerUrl ?? txExplorerUrl(exec.signature), what: tr('tour.ev.tx') } : null,
        exec?.confirmedAt ? { kind: 'time', label: exec.confirmationStatus ?? 'confirmed', at: exec.confirmedAt, truth: 'onchain' } : null,
      ]),
      open: live,
      verify: null,
    },
    // 6 — AcceptanceProof
    {
      line: tr('tour.6.line'),
      caveat:
        ev?.acceptance?.source === 'manual'
          ? tr('tour.6.caveat')
          : null,
      evidence: compact([
        ev
          ? {
              kind: 'text',
              label: tr('tour.ev.stages'),
              value: ACCEPTANCE_STAGES.map((s) => `${s} ${ev.acceptance?.stages?.[s] === true ? '✓' : ev.acceptance?.stages?.[s] === false ? '✗' : '?'}`).join('  '),
              truth: ev.acceptance?.source === 'manual' ? 'declared' : 'recorded',
              mono: true,
            }
          : null,
        ev?.artifact?.prUrl ? { kind: 'link', label: tr('tour.ev.pr'), value: prLabel(ev.artifact.prUrl), href: ev.artifact.prUrl, truth: 'recorded' } : null,
        ev?.acceptanceHash ? { kind: 'hash', label: tr('tour.ev.acchash'), value: ev.acceptanceHash, truth: 'recorded', what: tr('tour.ev.acchash') } : null,
      ]),
      open: valueRoute ? { label: tr('tour.open.value'), route: valueRoute } : null,
      verify: null,
    },
    // 7 — ValueEvent
    {
      line: tr('tour.7.line'),
      caveat: null,
      evidence: compact([
        ev?.receiptHash ? { kind: 'hash', label: tr('tour.ev.receipt'), value: ev.receiptHash, truth: 'recorded', what: tr('tour.ev.receipt') } : null,
        ev?.anchor?.root ? { kind: 'hash', label: tr('tour.ev.root'), value: ev.anchor.root, truth: 'onchain', what: tr('tour.ev.root') } : null,
        ev?.anchor?.txSignature
          ? { kind: 'hash', label: tr('tour.ev.anchor'), value: ev.anchor.txSignature, truth: 'onchain', href: ev.anchor.explorerUrl ?? txExplorerUrl(ev.anchor.txSignature), what: tr('tour.ev.anchor') }
          : null,
      ]),
      open: valueRoute ? { label: tr('tour.open.proof'), route: valueRoute, fragment: 'verify' } : null,
      verify: ev?.anchor?.txSignature && ev.anchor.root ? { signature: ev.anchor.txSignature, root: ev.anchor.root, slot: ev.anchor.slot ?? null } : null,
    },
    // 8 — Contribution Units
    {
      line: ev ? tr('tour.8.line', { u: ev.totalUnits, c: ev.contributions.length }) : tr('tour.8.line.plain'),
      caveat: tr('tour.8.caveat'),
      evidence: compact([
        ev
          ? {
              kind: 'bars',
              label: `policy ${ev.distributionPolicy}`,
              total: ev.totalUnits,
              truth: 'declared',
              rows: ev.contributions.map((c) => ({ name: c.displayName, role: c.role.toLowerCase().replace(/_/g, ' '), units: c.units, route: ['/value/identities', c.identityId] })),
            }
          : null,
      ]),
      open: { label: tr('tour.open.ledger'), route: ['/value/ledger'] },
      verify: null,
    },
    // 9 — Reward & Reputation
    rewardStep(d, tr),
  ];

  return POV_CHAIN.map((l, i) => ({ n: l.n, id: l.id, name: l.name, ...steps[i] }));
}

function rewardStep(d: TourData, tr: Tr): Omit<TourStep, 'n' | 'id' | 'name'> {
  const dist = d.distribution;
  const confirmed = dist ? dist.payouts.filter((x) => x.status === 'CONFIRMED') : [];
  const rev = d.revenue;
  const pol = rev ? revenuePolicyView(rev) : null;
  const rep = d.identity?.reputation ?? null;
  return {
    line: tr('tour.9.line'),
    caveat: rev?.simulated ? tr('tour.9.caveat') : null,
    evidence: compact([
      dist
        ? { kind: 'text', label: tr('tour.ev.paid'), value: tr('tour.ev.paid.v', { sol: lamportsToSol(confirmed.reduce((a, x) => a + x.lamports, 0)), n: confirmed.length }), truth: 'onchain' }
        : null,
      confirmed[0]?.txSignature
        ? { kind: 'hash', label: tr('tour.ev.payout', { who: confirmed[0].displayName }), value: confirmed[0].txSignature, truth: 'onchain', href: confirmed[0].explorerUrl ?? txExplorerUrl(confirmed[0].txSignature), what: tr('tour.ev.tx') }
        : null,
      rev && pol
        ? {
            kind: 'text',
            label: tr('tour.ev.split'),
            value: tr('tour.ev.split.v', { sol: lamportsToSol(rev.amountLamports), a: bpsPercent(pol.shareBps), b: bpsPercent(pol.feeBps), c: bpsPercent(pol.retainedBps) }),
            truth: rev.simulated ? 'simulated' : 'recorded',
          }
        : null,
      d.identity && rep
        ? { kind: 'text', label: tr('tour.ev.rep', { who: d.identity.displayName }), value: tr(rep.acceptedOutcomes === 1 ? 'tour.ev.rep.v1' : 'tour.ev.rep.vn', { n: rep.acceptedOutcomes, u: rep.totalUnits }), truth: 'recorded' }
        : null,
    ]),
    open: rev ? { label: tr('tour.open.money'), route: ['/value/revenue', rev.id] } : d.identity ? { label: tr('tour.open.identity'), route: ['/value/identities', d.identity.id] } : null,
    verify: null,
  };
}

function compact(xs: (Evidence | null)[]): Evidence[] {
  return xs.filter((x): x is Evidence => x !== null);
}

export function prLabel(url: string): string {
  const m = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(url);
  return m ? `${m[1]} #${m[2]}` : url;
}

/** Autoplay: 10 s per step, nine steps = 90 s. */
export const STEP_MS = 10_000;
