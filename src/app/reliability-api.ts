/**
 * Client for the operator side of reliability (demo path HK-3): the global
 * dead-letter queue (`/api/cryptobot/dead-letters`, RUNTIME_ADMIN) and the demo-only fault
 * injection (`/api/cryptobot/demo/chaos`, exists only with `cryptobot.chaos.enabled=true`).
 * Shapes mirror the Java records; nothing is computed here.
 */
import { ActionProposal, DeadLetter, OutboxEvent } from './control-plane-api';
import { apiFetch, throwHttp } from './cryptobot-api';

export interface DeadLetterPage {
  deadLetters: DeadLetter[];
  /** Global unresolved count (= `cryptobot_dead_letter_open`). */
  open: number;
  limit: number;
  offset: number;
}

/** What a resolve/requeue left behind: the letter and the proposal / outbox event it acted on. */
export interface DeadLetterResolution {
  deadLetter: DeadLetter;
  proposal: ActionProposal | null;
  reconciliation: 'MATCHED' | 'CORRECTED' | 'RETRIED' | 'DEAD_LETTERED' | 'SKIPPED' | null;
  event: OutboxEvent | null;
}

export type ChaosMode = 'uncertain' | 'rpc-down' | 'confirm-timeout';

export interface ChaosFault {
  at: string;
  mode: string;
  method: string;
  detail: string;
}

export interface ChaosView {
  broadcast: string | null;
  shotsLeft: number;
  armed: boolean;
  faults: ChaosFault[];
}

export const CHAOS_MODES: readonly { id: ChaosMode; label: string; what: string }[] = [
  { id: 'rpc-down', label: 'rpc-down', what: 'nothing is sent; status calls fail until disarmed → uncertain → DLQ → requeue → idempotent retry' },
  { id: 'uncertain', label: 'uncertain', what: 'sendTransaction happens, its answer is lost → the reconciler finds the signature confirmed' },
  { id: 'confirm-timeout', label: 'confirm-timeout', what: 'broadcast ok, the confirmation poll fails → SUBMITTED → reconciler → EXECUTED' },
];

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return throwHttp(res);
  }
  return (await res.json()) as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function listDeadLetters(resolved: 'all' | 'true' | 'false' = 'all', limit = 20): Promise<DeadLetterPage> {
  return apiFetch(`/dead-letters?resolved=${resolved}&limit=${limit}`).then((r) => json<DeadLetterPage>(r));
}

/** The open letters of one proposal (`?proposalId=`), what the recovery scene waits for. */
export function listProposalDeadLetters(proposalId: string): Promise<DeadLetterPage> {
  return apiFetch(`/dead-letters?proposalId=${proposalId}`).then((r) => json<DeadLetterPage>(r));
}

export function resolveDeadLetter(id: string, note?: string | null): Promise<DeadLetterResolution> {
  return apiFetch(`/dead-letters/${id}/resolve`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ note: note ?? null }) }).then((r) =>
    json<DeadLetterResolution>(r),
  );
}

export function requeueDeadLetter(id: string, note?: string | null): Promise<DeadLetterResolution> {
  return apiFetch(`/dead-letters/${id}/requeue`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ note: note ?? null }) }).then((r) =>
    json<DeadLetterResolution>(r),
  );
}

/**
 * The chaos control exists only in the demo stack. `null` means "not exposed here": 404 when the
 * bean is absent (UAT/PROD), 403 when the operator is not an admin, or the network failed. The UI
 * hides the control in every one of those cases; only a 200 shows it.
 */
export async function getChaos(): Promise<ChaosView | null> {
  try {
    const res = await apiFetch('/demo/chaos');
    return res.ok ? ((await res.json()) as ChaosView) : null;
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthRequiredError') {
      throw e;
    }
    return null;
  }
}

/** `shots` = -1 keeps the fault until disarmed; n > 0 consumes one shot per faulted RPC call. */
export function armChaos(mode: ChaosMode, shots = -1): Promise<ChaosView> {
  return apiFetch('/demo/chaos', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ broadcast: mode, shots }) }).then((r) => json<ChaosView>(r));
}

export function disarmChaos(): Promise<ChaosView> {
  return apiFetch('/demo/chaos', { method: 'DELETE' }).then((r) => json<ChaosView>(r));
}
