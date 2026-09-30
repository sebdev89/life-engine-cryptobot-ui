import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopNav } from '../shell/top-nav';

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

/**
 * `/` (KAN-789): the public pitch. No session, no API call, nothing lazy — it renders from the main
 * bundle so the first paint is the hero. The CTA opens Demo Mode (which asks for a token if the
 * browser has none); the operator console lives at `/console`.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TopNav],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  readonly stages = LANDING_STAGES;
  readonly failure = FAILURE_LINE;

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
