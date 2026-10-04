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

/** Pure: the nine steps from what the recording holds. Evidence rows with no value are dropped. */
export function buildTour(d: TourData): TourStep[] {
  const p = d.proposal as P | null;
  const ev = d.event;
  const pid = p?.id ?? null;
  const live = pid ? { label: 'Open the execution screen', route: ['/live', pid] } : null;
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
      line: `The agent asks for a rebalance${weights(p?.intent?.targetWeights) ? ` toward ${weights(p?.intent?.targetWeights)}` : ''}, and nothing moves until the rest of the chain agrees.`,
      caveat: null,
      evidence: compact([
        p?.title ? { kind: 'text', label: 'proposal', value: p.title, truth: 'recorded' } : null,
        p?.reasoningSummary ? { kind: 'text', label: 'reason given by the agent', value: p.reasoningSummary, truth: 'declared' } : null,
        created ? { kind: 'time', label: 'created', at: created, truth: 'recorded' } : null,
      ]),
      open: live,
      verify: null,
    },
    // 2 — Strategist
    {
      line: 'A deterministic planner turns the intent into an exact amount, and the exact transaction bytes are simulated on devnet first.',
      caveat: 'Strategist is a role name: in this run it is a deterministic planner and a risk engine, not a language model.',
      evidence: compact([
        finding?.title ? { kind: 'text', label: `risk finding (${(finding.severity ?? '').toLowerCase()})`, value: finding.title, truth: 'recorded' } : null,
        moved ? { kind: 'text', label: 'planned transfer', value: `${moved} to the agent's own vault`, truth: 'recorded', mono: false } : null,
        tx?.destination ? { kind: 'hash', label: 'vault address', value: tx.destination, truth: 'recorded', href: explorerAddressUrl(tx.destination), what: 'vault address' } : null,
        sim?.onchain
          ? { kind: 'text', label: 'simulation on devnet', value: `${sim.onchain.ok ? 'passed' : 'failed'}${typeof sim.onchain.unitsConsumed === 'number' ? ` · ${sim.onchain.unitsConsumed} compute units` : ''}`, truth: 'recorded' }
          : null,
      ]),
      open: live,
      verify: null,
    },
    // 3 — Guardian
    {
      line: 'Policy rules under a versioned policy hash decide whether the transfer may go ahead, and with which safeguards.',
      caveat:
        policy?.authorization?.decision === 'ESCALATE'
          ? 'Here the verdict escalates: the effect is a timelock plus operator approval. No second agent takes part in this run.'
          : null,
      evidence: compact([
        policy?.rulesApplied
          ? { kind: 'text', label: 'policy checks applied', value: `${policy.rulesApplied.length} checks · ${policy.violations?.length ?? 0} violations`, truth: 'recorded' }
          : null,
        policy?.authorization?.decision
          ? { kind: 'text', label: 'verdict', value: `${policy.authorization.decision}${policy.authorization.tier ? ` · tier ${policy.authorization.tier}` : ''}`, truth: 'recorded', mono: true }
          : null,
        timelock !== null ? { kind: 'text', label: 'timelock before execution', value: `${timelock} s`, truth: 'recorded' } : null,
        policy?.authorization?.policyHash ? { kind: 'hash', label: `policy hash${policy.authorization.policyVersion ? ` (${policy.authorization.policyVersion})` : ''}`, value: policy.authorization.policyHash, truth: 'recorded', what: 'policy hash' } : null,
      ]),
      open: { label: 'Open the policy screen', route: ['/policies'] },
      verify: null,
    },
    // 4 — Operator
    {
      line: 'The operator approves; an independent validator re-derives the verdict, and an isolated signer signs only those bytes.',
      caveat: 'In this recorded run the approval came from the demo operator account.',
      evidence: compact([
        approval?.at ? { kind: 'time', label: 'approved', at: approval.at, truth: 'recorded' } : null,
        str(validated['verdictHash']) ? { kind: 'hash', label: 'validator verdict hash', value: String(validated['verdictHash']), truth: 'recorded', what: 'verdict hash' } : null,
        exec?.signerPublicKey ? { kind: 'hash', label: 'signer public key', value: exec.signerPublicKey, truth: 'recorded', href: explorerAddressUrl(exec.signerPublicKey), what: 'signer public key' } : null,
      ]),
      open: live,
      verify: null,
    },
    // 5 — Solana
    {
      line: `The transfer${moved ? ` of ${moved}` : ''} is broadcast and finalized on Solana devnet.`,
      caveat: "It is a SOL transfer from the agent's wallet to its own vault, not a swap.",
      evidence: compact([
        exec?.signature ? { kind: 'hash', label: 'transaction', value: exec.signature, truth: 'onchain', href: exec.explorerUrl ?? txExplorerUrl(exec.signature), what: 'transaction signature' } : null,
        exec?.confirmedAt ? { kind: 'time', label: exec.confirmationStatus ?? 'confirmed', at: exec.confirmedAt, truth: 'onchain' } : null,
      ]),
      open: live,
      verify: null,
    },
    // 6 — AcceptanceProof
    {
      line: 'The software the agent runs on counts only once it is merged, built, deployed, running and accepted.',
      caveat:
        ev?.acceptance?.source === 'manual'
          ? 'In this recorded run the five stages were asserted by the operator (source: manual), not measured by the pipeline.'
          : null,
      evidence: compact([
        ev
          ? {
              kind: 'text',
              label: 'acceptance stages',
              value: ACCEPTANCE_STAGES.map((s) => `${s} ${ev.acceptance?.stages?.[s] === true ? '✓' : ev.acceptance?.stages?.[s] === false ? '✗' : '?'}`).join('  '),
              truth: ev.acceptance?.source === 'manual' ? 'declared' : 'recorded',
              mono: true,
            }
          : null,
        ev?.artifact?.prUrl ? { kind: 'link', label: 'pull request', value: prLabel(ev.artifact.prUrl), href: ev.artifact.prUrl, truth: 'recorded' } : null,
        ev?.acceptanceHash ? { kind: 'hash', label: 'acceptance hash', value: ev.acceptanceHash, truth: 'recorded', what: 'acceptance hash' } : null,
      ]),
      open: valueRoute ? { label: 'Open the ValueEvent', route: valueRoute } : null,
      verify: null,
    },
    // 7 — ValueEvent
    {
      line: 'The accepted outcome becomes a signed receipt whose Merkle root is written to Solana. Anyone can check it.',
      caveat: null,
      evidence: compact([
        ev?.receiptHash ? { kind: 'hash', label: 'signed receipt', value: ev.receiptHash, truth: 'recorded', what: 'receipt hash' } : null,
        ev?.anchor?.root ? { kind: 'hash', label: 'Merkle root', value: ev.anchor.root, truth: 'onchain', what: 'Merkle root' } : null,
        ev?.anchor?.txSignature
          ? { kind: 'hash', label: 'anchor transaction', value: ev.anchor.txSignature, truth: 'onchain', href: ev.anchor.explorerUrl ?? txExplorerUrl(ev.anchor.txSignature), what: 'anchor transaction signature' }
          : null,
      ]),
      open: valueRoute ? { label: 'Open the proof', route: valueRoute, fragment: 'verify' } : null,
      verify: ev?.anchor?.txSignature && ev.anchor.root ? { signature: ev.anchor.txSignature, root: ev.anchor.root, slot: ev.anchor.slot ?? null } : null,
    },
    // 8 — Contribution Units
    {
      line: ev ? `${ev.totalUnits} Contribution Units are split across the ${ev.contributions.length} contributions the task record names.` : 'Contribution Units record who contributed.',
      caveat: 'Units are attribution: not equity, not a token, not a promise of return.',
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
      open: { label: 'Open the units ledger', route: ['/value/ledger'] },
      verify: null,
    },
    // 9 — Reward & Reputation
    rewardStep(d),
  ];

  return POV_CHAIN.map((l, i) => ({ n: l.n, id: l.id, name: l.name, ...steps[i] }));
}

function rewardStep(d: TourData): Omit<TourStep, 'n' | 'id' | 'name'> {
  const dist = d.distribution;
  const confirmed = dist ? dist.payouts.filter((x) => x.status === 'CONFIRMED') : [];
  const rev = d.revenue;
  const pol = rev ? revenuePolicyView(rev) : null;
  const rep = d.identity?.reputation ?? null;
  return {
    line: 'Each contributor is paid on Solana by units, one transfer per wallet, and each identity keeps plain counts of accepted outcomes.',
    caveat: rev?.simulated ? 'The revenue in this run is simulated to exercise the split; the payouts are real devnet transfers.' : null,
    evidence: compact([
      dist
        ? { kind: 'text', label: 'reward paid', value: `${lamportsToSol(confirmed.reduce((a, x) => a + x.lamports, 0))} SOL to ${confirmed.length} wallets`, truth: 'onchain' }
        : null,
      confirmed[0]?.txSignature
        ? { kind: 'hash', label: `payout to ${confirmed[0].displayName}`, value: confirmed[0].txSignature, truth: 'onchain', href: confirmed[0].explorerUrl ?? txExplorerUrl(confirmed[0].txSignature), what: 'payout transaction signature' }
        : null,
      rev && pol
        ? {
            kind: 'text',
            label: 'revenue split',
            value: `${lamportsToSol(rev.amountLamports)} SOL → ${bpsPercent(pol.shareBps)} contributors · ${bpsPercent(pol.feeBps)} protocol · ${bpsPercent(pol.retainedBps)} retained`,
            truth: rev.simulated ? 'simulated' : 'recorded',
          }
        : null,
      d.identity && rep
        ? { kind: 'text', label: `reputation of ${d.identity.displayName}`, value: `${rep.acceptedOutcomes} accepted outcome${rep.acceptedOutcomes === 1 ? '' : 's'} · ${rep.totalUnits} units`, truth: 'recorded' }
        : null,
    ]),
    open: rev ? { label: 'Open the money flow', route: ['/value/revenue', rev.id] } : d.identity ? { label: 'Open the identity', route: ['/value/identities', d.identity.id] } : null,
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
