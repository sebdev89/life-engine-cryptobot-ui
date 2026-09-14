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

export interface PolicyDecision {
  allowed: boolean;
  executable: boolean;
  violations: PolicyViolation[];
  executionViolations: PolicyViolation[];
  rulesApplied: string[];
  evaluatedAt: string;
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
}

export interface ExecutionRecord {
  status: string;
  signature: string | null;
  explorerUrl: string | null;
  signerPublicKey: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  confirmationStatus: string | null;
  error: string | null;
}

export type ProposalStatus =
  | 'PROPOSED'
  | 'SIMULATED'
  | 'BLOCKED_BY_POLICY'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
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

export function executeProposal(proposalId: string): Promise<ActionProposal> {
  return apiFetch(`/proposals/${proposalId}/execute`, { method: 'POST' }).then((r) => json<ActionProposal>(r));
}
