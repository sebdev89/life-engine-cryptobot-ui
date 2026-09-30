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
  /** Not in the V1 contract; shown only when the body carries it. */
  commitSha?: string | null;
  /** Not in the V1 contract; `{stage: passed}` when the body carries it. */
  acceptance?: { stages?: Record<string, boolean> } | null;
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
