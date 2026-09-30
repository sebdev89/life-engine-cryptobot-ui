/**
 * Client for Proof of Value (KAN-828 over the KAN-818 backend): `/api/cryptobot/value-events/**` and `/identities`.
 * The shapes mirror the contract agreed for V1; everything beyond it is optional and rendered only if present.
 */
import { apiFetch, throwHttp } from './cryptobot-api';

export type ValueEventStatus = 'RECORDED' | 'ANCHORED';
export type IdentityKind = 'HUMAN' | 'AGENT';

export interface ValueAnchor {
  root: string;
  txSignature: string;
  slot: number | null;
  explorerUrl: string | null;
}

export interface ValueContribution {
  identityId: string;
  displayName: string;
  kind: IdentityKind;
  role: string;
  units: number;
}

export interface ValueArtifact {
  commitSha?: string | null;
  prUrl?: string | null;
  imageDigest?: string | null;
}

export type StageName = 'MERGED' | 'BUILT' | 'DEPLOYED' | 'RUNNING' | 'ACCEPTED';

export interface ValueAcceptance {
  source?: string | null;
  environment?: string | null;
  stages?: Partial<Record<StageName, boolean>> | null;
  evidenceRef?: string | null;
  acceptedAt?: string | null;
}

export interface ValueEvent {
  id: string;
  receiptHash: string;
  artifactHash: string;
  acceptanceHash: string;
  status: ValueEventStatus;
  anchor: ValueAnchor | null;
  distributionPolicy: string;
  totalUnits: number;
  contributions: ValueContribution[];
  projectId: string;
  taskId: string;
  title: string;
  acceptedAt: string;
  createdAt: string;
  artifact?: ValueArtifact | null;
  acceptance?: ValueAcceptance | null;
  /** V3/V4 (KAN-830): absent on a V1 backend, empty when nothing was attributed. */
  knowledgeAssets?: EventKnowledgeAsset[] | null;
  computeReceipts?: ComputeReceipt[] | null;
  /** V5 (KAN-822): null/absent until an immediate reward distribution exists. */
  distribution?: DistributionSummary | null;
  /** V7 (KAN-832): revenue events this outcome participates in; absent on an older backend. */
  revenueShares?: RevenueShare[] | null;
}

export interface RevenueShare {
  revenueEventId: string;
  lamports: number;
}

export type DistributionStatus = 'PARTIAL' | 'COMPLETE' | 'FAILED';
export type PayoutStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'UNFUNDED';

export interface DistributionSummary {
  status: DistributionStatus;
  poolLamports: number;
  confirmedLamports: number;
}

export interface Payout {
  identityId: string;
  displayName: string;
  wallet: string | null;
  lamports: number;
  status: PayoutStatus;
  txSignature: string | null;
  explorerUrl: string | null;
  error: string | null;
}

/** `GET|POST /value-events/{id}/distribution|distribute`. */
export interface Distribution {
  id: string;
  valueEventId: string;
  poolLamports: number;
  policy: string;
  status: DistributionStatus;
  receiptHash: string;
  anchor: ValueAnchor | null;
  payouts: Payout[];
}

export interface IdentityRewards {
  confirmedLamports: number;
  /** V7 (KAN-832): confirmed lamports that came from revenue events; absent on an older backend. */
  revenueLamports?: number | null;
  /** The real backend returns the COUNT of confirmed payouts (`"payouts": 5`); older fixtures carried the rows. */
  payouts: number | Payout[];
}

export interface EventKnowledgeAsset {
  id: string;
  version: number | string;
  kind: string;
  title: string;
  creatorId: string;
  contentHash: string;
}

export interface ComputeReceipt {
  id: string;
  providerId: string;
  providerDisplayName: string;
  node: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  gpuSeconds: number;
  estimatedCostMicroUsd: number;
  providerWallet: string | null;
}

/** `GET /value-events/{id}/proof`: shown as received; `verified` is the server's verdict. */
export interface ValueProof {
  receiptHash: string;
  root: string | null;
  txSignature: string | null;
  verified: boolean;
  [extra: string]: unknown;
}

export interface Identity {
  id: string;
  kind: IdentityKind;
  displayName: string;
  wallet: string | null;
  ownerId: string | null;
  operatorId: string | null;
  createdAt?: string | null;
  reputation?: Reputation | null;
}

export interface Reputation {
  acceptedOutcomes: number;
  totalUnits: number;
  firstAcceptedAt: string | null;
  lastAcceptedAt: string | null;
}

export interface HistoryEntry {
  valueEventId: string;
  title: string;
  role: string;
  units: number;
  acceptedAt: string;
  anchorStatus: string;
}

export interface IdentityProfile extends Identity {
  history: HistoryEntry[];
  /** V5 (KAN-822): absent on an older backend. */
  rewards?: IdentityRewards | null;
}

export interface KnowledgeAsset {
  id: string;
  version: number | string;
  kind: string;
  title: string;
  creatorId: string;
  creatorDisplayName: string;
  contentHash: string;
  parentIds: string[];
  createdAt: string;
  usedIn: string[];
}

export type LedgerGroupBy = 'identity' | 'asset' | 'project';

export interface LedgerRow {
  key: string;
  displayName: string;
  kind?: string | null;
  totalUnits: number;
  acceptedOutcomes: number;
}

export interface UnitsLedger {
  groupBy: LedgerGroupBy;
  rows: LedgerRow[];
  totalUnits: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return throwHttp(res);
  }
  return (await res.json()) as T;
}

export function listValueEvents(limit = 50): Promise<ValueEvent[]> {
  return apiFetch(`/value-events?limit=${limit}`).then((r) => json<ValueEvent[]>(r));
}

export function getValueEvent(id: string): Promise<ValueEvent> {
  return apiFetch(`/value-events/${encodeURIComponent(id)}`).then((r) => json<ValueEvent>(r));
}

export function getValueProof(id: string): Promise<ValueProof> {
  return apiFetch(`/value-events/${encodeURIComponent(id)}/proof`).then((r) => json<ValueProof>(r));
}

export function listIdentities(): Promise<Identity[]> {
  return apiFetch('/identities').then((r) => json<Identity[]>(r));
}

export function getIdentity(id: string): Promise<IdentityProfile> {
  return apiFetch(`/identities/${encodeURIComponent(id)}`).then((r) => json<IdentityProfile>(r));
}

export function listKnowledgeAssets(): Promise<KnowledgeAsset[]> {
  return apiFetch('/knowledge-assets').then((r) => json<KnowledgeAsset[]>(r));
}

export function getKnowledgeAsset(id: string): Promise<KnowledgeAsset> {
  return apiFetch(`/knowledge-assets/${encodeURIComponent(id)}`).then((r) => json<KnowledgeAsset>(r));
}

export function getUnitsLedger(groupBy: LedgerGroupBy): Promise<UnitsLedger> {
  return apiFetch(`/units/ledger?groupBy=${groupBy}`).then((r) => json<UnitsLedger>(r));
}

/** 404 means no distribution yet: returned as null, not thrown. */
export async function getDistribution(id: string): Promise<Distribution | null> {
  const res = await apiFetch(`/value-events/${encodeURIComponent(id)}/distribution`);
  if (res.status === 404) return null;
  return json<Distribution>(res);
}

/** Needs RUNTIME_ADMIN; 409 when the event is not ANCHORED. */
export function distributeValueEvent(id: string): Promise<Distribution> {
  return apiFetch(`/value-events/${encodeURIComponent(id)}/distribute`, { method: 'POST' }).then((r) => json<Distribution>(r));
}

export type RevenueSourceKind = 'PROPOSAL' | 'SIMULATED' | 'EXTERNAL';

/** V7 (KAN-832): `GET /revenue-events[/{id}]`. The bps live in `policy`; the UI never hardcodes them. */
export interface RevenueEvent {
  id: string;
  projectId: string;
  source: { kind: RevenueSourceKind; ref: string | null };
  simulated: boolean;
  amountLamports: number;
  policy: RevenuePolicy | string;
  contributorPoolLamports: number;
  protocolFeeLamports: number;
  retainedLamports: number;
  status: DistributionStatus;
  receiptHash: string;
  anchor: ValueAnchor | null;
  linkedValueEvents: { id: string; title: string }[];
  payouts: Payout[];
  createdAt: string;
}

/** The contract says `policy`; a structured object with bps is read when present, a plain name is shown as is. */
export interface RevenuePolicy {
  name?: string | null;
  revenueShareBps?: number | null;
  protocolFeeBps?: number | null;
  [extra: string]: unknown;
}

export interface RevenueEventRequest {
  projectId: string;
  source: { kind: RevenueSourceKind; ref: string | null };
  amountLamports: number;
  linkedValueEventIds: string[];
  simulated: boolean;
}

export interface TreasuryEvent {
  kind: 'VALUE' | 'REVENUE' | 'PAYOUT';
  id: string;
  lamports: number | null;
  at: string;
  txSignature: string | null;
}

/** `GET /treasury/{identityId}`. */
export interface Treasury {
  identityId: string;
  wallet: string | null;
  onChainBalanceLamports: number | null;
  incomeLamports: number;
  contributorPayoutsLamports: number;
  protocolFeeLamports: number;
  computeCostMicroUsd: number;
  retainedLamports: number;
  policies: { rewardPoolLamports: number; revenueShareBps: number; protocolFeeBps: number; signerMaxLamports: number };
  recentEvents: TreasuryEvent[];
}

export function listRevenueEvents(): Promise<RevenueEvent[]> {
  return apiFetch('/revenue-events').then((r) => json<RevenueEvent[]>(r));
}

export function getRevenueEvent(id: string): Promise<RevenueEvent> {
  return apiFetch(`/revenue-events/${encodeURIComponent(id)}`).then((r) => json<RevenueEvent>(r));
}

/** Needs RUNTIME_ADMIN; 409/422 carry a message. Not used by a page yet, kept with the contract. */
export function createRevenueEvent(req: RevenueEventRequest): Promise<RevenueEvent> {
  return apiFetch('/revenue-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }).then((r) => json<RevenueEvent>(r));
}

export function getTreasury(identityId: string): Promise<Treasury> {
  return apiFetch(`/treasury/${encodeURIComponent(identityId)}`).then((r) => json<Treasury>(r));
}

/** Payout count of an identity's rewards, whether the API sent the count or the rows. */
export function payoutCount(payouts: number | Payout[] | null | undefined): number {
  return Array.isArray(payouts) ? payouts.length : (payouts ?? 0);
}
