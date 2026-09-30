import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopNav } from '../shell/top-nav';
import { listValueEvents, type ValueEvent } from '../value-events-api';

/** The eight stages as the landing names them; the ids are the ones of `live-model.STAGE_MAP` (a test keeps them aligned). */
export const LANDING_STAGES: readonly { id: string; what: string }[] = [
  { id: 'INTENT', what: 'agent intent → plan' },
  { id: 'POLICY', what: '13 rules · simulation' },
  { id: 'APPROVAL', what: 'human · timelock' },
  { id: 'SIGN', what: 'validator · isolated signer' },
  { id: 'EXECUTE', what: 'broadcast · operationId' },
  { id: 'FINALIZE', what: 'confirmed on Solana' },
  { id: 'RECONCILE', what: 'chain vs ledger · DLQ' },
  { id: 'PROVE', what: 'signed receipt · Merkle proof' },
];

/** The failure scene in one line (Demo Mode, scenario B). */
export const FAILURE_LINE: readonly string[] = ['RPC down', 'dead letter', 'retry', 'same key', 'one transaction'];

/** The newest anchored outcome, preferring one whose reward distribution exists; null when there is none. */
export function pickProofEvent(events: readonly ValueEvent[]): ValueEvent | null {
  const anchored = events.filter((e) => e.status === 'ANCHORED');
  return anchored.find((e) => e.distribution) ?? anchored[0] ?? null;
}

/**
 * `/`: the public pitch. It renders from the main bundle so the first paint is the hero. The only call
 * is best-effort: "See a real proof" resolves at runtime to the newest anchored ValueEvent and falls
 * back to `/value` when there is no session or no API.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TopNav],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  readonly stages = LANDING_STAGES;
  readonly failure = FAILURE_LINE;
  readonly proofLink = signal<string>('/value');

  async ngOnInit(): Promise<void> {
    try {
      const ev = pickProofEvent(await listValueEvents(20));
      if (ev) this.proofLink.set(`/value/${encodeURIComponent(ev.id)}`);
    } catch {
      // no session or no API: the button stays on /value
    }
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
