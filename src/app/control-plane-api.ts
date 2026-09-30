/**
 * Client for the control-plane endpoints (`/api/cryptobot/wallets/**`, `/api/cryptobot/proposals/**`).
 * Shapes mirror the Java records one-to-one; nothing is computed here.
 */
import { apiFetch, throwHttp } from './cryptobot-api';

export interface WalletView {
  id: string;
  address: string;
  cluster: string;
  label: string | null;
  explorerUrl: string;
  createdAt: string;
}

export interface Position {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
  weightPct: number | null;
  stable: boolean;
  nativeSol: boolean;
  priceSource: string | null;
}

export interface PortfolioSnapshot {
  id: string;
  walletId: string;
  capturedAt: string;
  totalUsd: number;
  positions: Position[];
  priceSource: string;
  recentTxCount: number;
}

export interface RiskFinding {
  code: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail: string;
  asset: string | null;
  metric: number | null;
  threshold: number | null;
}

export interface RiskReport {
  findings: RiskFinding[];
  overall: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  evaluatedAt: string;
}

export interface PortfolioChange {
  symbol: string;
  amountBefore: number | null;
  amountAfter: number | null;
  valueUsdBefore: number | null;
  valueUsdAfter: number | null;
  weightPctBefore: number | null;
  weightPctAfter: number | null;
  weightPctDelta: number;
}

export interface PortfolioDiff {
  previousCapturedAt: string;
  currentCapturedAt: string;
  totalUsdBefore: number;
  totalUsdAfter: number;
  totalUsdDeltaPct: number | null;
  changes: PortfolioChange[];
  largestMoveSymbol: string | null;
  largestWeightPctDelta: number;
}

export interface PortfolioResponse {
  wallet: WalletView;
  snapshot: PortfolioSnapshot;
  risk: RiskReport;
  changes: PortfolioDiff | null;
}

export interface KeyRisk {
  title: string;
  severity: string;
  why: string;
}

export interface SuggestedAction {
  action: 'REBALANCE' | 'HOLD' | 'ADD_STABLES';
  asset: string | null;
  targetWeightPct: number | null;
  rationale: string;
}

export interface AdvisorAnswer {
  answer: string;
  keyRisks: KeyRisk[];
  suggestedActions: SuggestedAction[];
  confidence: number | null;
  disclaimer: string;
  promptVersion: string;
  runtimeRunId: string;
  model: string | null;
}

export interface AskResponse {
  answer: AdvisorAnswer;
  runtimeRunId: string;
  runtimeBaseUrl: string;
  ssePath: string;
}

export interface MessageView {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured: Record<string, unknown>;
  runtimeRunId: string | null;
  createdAt: string;
}

export interface RebalanceLeg {
  action: 'SELL' | 'BUY';
  symbol: string;
  mint: string | null;
  amount: number;
  estimatedUsd: number;
  weightPctBefore: number;
  weightPctAfter: number;
  counterAsset: string;
}

export interface RebalancePlan {
  legs: RebalanceLeg[];
  totalUsd: number;
  weightsBefore: Record<string, number>;
  weightsAfter: Record<string, number>;
  turnoverUsd: number;
  summary: string;
}

export interface PolicyViolation {
  rule: string;
  message: string;
}

/** KAN-436: the graduated verdict of the deterministic engine over `(I, S, R_v)`; null on rows older than it. */
export interface PolicyVerdict {
  decision: 'ALLOW' | 'DENY' | 'ESCALATE';
  escalation: 'NONE' | 'REQUIRE_SECOND_AGENT' | 'REQUIRE_HUMAN_SIGNATURE';
  tier: 'AUTONOMOUS' | 'SECOND_AGENT' | 'HUMAN_SIGNATURE' | 'OVER_LIMIT';
  failedPredicates: string[];
  evaluatedPredicates: string[];
  policyVersion: string;
  policyHash: string;
  inputHash: string;
}

export interface PolicyDecision {
  allowed: boolean;
  executable: boolean;
  violations: PolicyViolation[];
  executionViolations: PolicyViolation[];
  rulesApplied: string[];
  evaluatedAt: string;
  authorization?: PolicyVerdict | null;
  /** The exact `(I, S)` the verdict was computed over (KAN-438); opaque to the UI. */
  input?: Record<string, unknown> | null;
  /** KAN-439 / KAN-572: the price consensus the price-integrity rules were evaluated on. */
  oracle?: OracleReading | null;
}

export interface OracleQuote {
  source: string;
  asset: string;
  mint: string | null;
  priceUsd: number;
  observedAt: string;
}

export interface OracleAsset {
  asset: string;
  mint: string | null;
  priceUsd: number | null;
  asOf: string | null;
  used: OracleQuote[];
  rejected: unknown[];
  refusals: unknown[];
  problems: unknown[];
  quotesHash: string | null;
}

export interface OracleReading {
  readAt: string;
  limits: { minSources: number; maxAgeSeconds: number; maxDeviationBps: number; maxMoveBps: number; moveIntervalSeconds: number };
  assets: OracleAsset[];
}

export interface SimulationOutcome {
  economic: {
    sellSymbol: string;
    sellAmount: number;
    buySymbol: string;
    expectedBuyAmount: number;
    priceUsd: number;
    estimatedFeeSol: number;
    priceImpactPct: number;
    source: string;
  } | null;
  onchain: {
    ok: boolean;
    error: string | null;
    unitsConsumed: number | null;
    logs: string[];
    cluster: string;
  } | null;
}

export interface PreparedTransaction {
  cluster: string;
  feePayer: string;
  destination: string;
  lamports: number;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  unsignedTransactionBase64: string;
  messageBase64: string;
  instructionSummary: string;
}

export interface ApprovalRecord {
  decision: 'APPROVED' | 'REJECTED';
  by: string;
  at: string;
  note: string | null;
  /** Timelock (KAN-438): the proposal cannot execute before this instant; null when rejected. */
  executableAt?: string | null;
}

export interface ExecutionRecord {
  /** Fine-grained step: SIGNED (nothing broadcast yet) · SUBMITTED · EXECUTED · FAILED. */
  status: string;
  signature: string | null;
  explorerUrl: string | null;
  signerPublicKey: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  confirmationStatus: string | null;
  error: string | null;
  recentBlockhash?: string | null;
  lastValidBlockHeight?: number | null;
  reconciliationAttempts?: number;
  reconciledAt?: string | null;
  /** KAN-571: idempotent retries under the same operationId (0 on the first attempt). */
  retries?: number;
  previousSignature?: string | null;
}

export type ProposalStatus =
  | 'PROPOSED'
  | 'SIMULATED'
  | 'BLOCKED_BY_POLICY'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'SUBMITTED'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED';

export interface ActionProposal {
  id: string;
  walletId: string;
  walletAddress: string;
  cluster: string;
  status: ProposalStatus;
  kind: string;
  title: string;
  reasoningSummary: string | null;
  requestedBy: string;
  intent: { targetWeights: Record<string, number>; counterAsset: string };
  plan: RebalancePlan;
  riskBefore: RiskReport | null;
  riskAfter: RiskReport | null;
  policy: PolicyDecision | null;
  simulation: SimulationOutcome | null;
  transaction: PreparedTransaction | null;
  approval: ApprovalRecord | null;
  execution: ExecutionRecord | null;
  runtimeRunId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** KAN-403: idempotency key of the execution; set in the same commit that moves the row to EXECUTING. */
  operationId?: string | null;
}

export interface AuditEvent {
  id: string;
  walletId: string | null;
  proposalId: string | null;
  eventType: string;
  actor: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** One row of the transactional outbox (KAN-403): written with the state change, published later. */
export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
  publishedAt: string | null;
}

/** `GET /proposals/{id}/events`: the durable event stream of one proposal plus its dead letters. */
export interface ProposalEvents {
  proposalId: string;
  status: string;
  operationId: string | null;
  events: OutboxEvent[];
  deadLetters: DeadLetter[];
}

/** A dead letter (KAN-571 / KAN-501): what the system refuses to guess about; a human resolves it. */
export interface DeadLetter {
  id: string;
  source: 'OUTBOX' | 'RECONCILIATION';
  refId: string;
  proposalId: string | null;
  ownerUserId: string | null;
  reason: string;
  payload: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  outcome: 'RESOLVED' | 'REQUEUED' | null;
}

export interface ActivityItem {
  signature: string;
  slot: number;
  blockTime: string | null;
  failed: boolean;
  memo: string | null;
  explorerUrl: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return throwHttp(res);
  }
  return (await res.json()) as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function listWallets(): Promise<WalletView[]> {
  return apiFetch('/wallets').then((r) => json<WalletView[]>(r));
}

export function registerWallet(address: string, cluster: string, label?: string): Promise<PortfolioResponse> {
  return apiFetch('/wallets', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ address, cluster, label }),
  }).then((r) => json<PortfolioResponse>(r));
}

export function getPortfolio(walletId: string): Promise<PortfolioResponse> {
  return apiFetch(`/wallets/${walletId}/portfolio`).then((r) => json<PortfolioResponse>(r));
}

export function refreshPortfolio(walletId: string): Promise<PortfolioResponse> {
  return apiFetch(`/wallets/${walletId}/refresh`, { method: 'POST' }).then((r) => json<PortfolioResponse>(r));
}

export function getActivity(walletId: string, limit = 8): Promise<ActivityItem[]> {
  return apiFetch(`/wallets/${walletId}/activity?limit=${limit}`).then((r) => json<ActivityItem[]>(r));
}

export function askAdvisor(walletId: string, question: string, proposalId?: string | null): Promise<AskResponse> {
  return apiFetch(`/wallets/${walletId}/ask`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ question, proposalId: proposalId ?? null }),
  }).then((r) => json<AskResponse>(r));
}

export function listMessages(walletId: string): Promise<MessageView[]> {
  return apiFetch(`/wallets/${walletId}/messages?limit=50`).then((r) => json<MessageView[]>(r));
}

export function createRebalance(
  walletId: string,
  targetWeights: Record<string, number>,
  reasoningSummary?: string,
  runtimeRunId?: string | null,
): Promise<{ proposal: ActionProposal; audit: AuditEvent[] }> {
  return apiFetch(`/wallets/${walletId}/proposals`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ kind: 'REBALANCE', targetWeights, reasoningSummary, runtimeRunId: runtimeRunId ?? null }),
  }).then((r) => json<{ proposal: ActionProposal; audit: AuditEvent[] }>(r));
}

/** All proposals of the operator (every wallet), newest first — the picker of the live view (KAN-576). */
export function listAllProposals(limit = 20): Promise<ActionProposal[]> {
  return apiFetch(`/proposals?limit=${limit}`).then((r) => json<ActionProposal[]>(r));
}

export function listProposals(walletId: string): Promise<ActionProposal[]> {
  return apiFetch(`/wallets/${walletId}/proposals?limit=20`).then((r) => json<ActionProposal[]>(r));
}

export function getProposal(proposalId: string): Promise<{ proposal: ActionProposal; audit: AuditEvent[] }> {
  return apiFetch(`/proposals/${proposalId}`).then((r) => json<{ proposal: ActionProposal; audit: AuditEvent[] }>(r));
}

export function decideProposal(proposalId: string, decision: 'approve' | 'reject', note?: string): Promise<ActionProposal> {
  return apiFetch(`/proposals/${proposalId}/${decision}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ note: note ?? null }),
  }).then((r) => json<ActionProposal>(r));
}

/**
 * Second, explicit click. `operationId` is the idempotency key (KAN-403): the same key never
 * produces a second transaction. It travels in the body (`ExecuteRequest`) because the
 * `Idempotency-Key` header is not in the service's CORS allow-list; the controller documents the
 * body as the fallback.
 */
export function executeProposal(proposalId: string, operationId?: string | null): Promise<ActionProposal> {
  const init: RequestInit = operationId
    ? { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ operationId }) }
    : { method: 'POST' };
  return apiFetch(`/proposals/${proposalId}/execute`, init).then((r) => json<ActionProposal>(r));
}

/** KAN-438: a human cancels an APPROVED proposal inside its timelock. */
export function cancelProposal(proposalId: string, note?: string): Promise<ActionProposal> {
  return apiFetch(`/proposals/${proposalId}/cancel`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ note: note ?? null }),
  }).then((r) => json<ActionProposal>(r));
}

export function getProposalEvents(proposalId: string): Promise<ProposalEvents> {
  return apiFetch(`/proposals/${proposalId}/events`).then((r) => json<ProposalEvents>(r));
}
