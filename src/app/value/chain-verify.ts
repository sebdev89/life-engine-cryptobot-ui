import { Component, computed, input, signal } from '@angular/core';
import { HashChip } from '../ui/hash';
import { TruthChip } from '../ui/truth';
import { When } from '../ui/when';
import { slotLabel } from '../ui/format';
import { DEVNET_RPC, DevnetVerdict, groups, verifyOnDevnet } from './devnet-verify';

/** One answer per signature and page load: a second click does not hit devnet again. */
const cache = new Map<string, Promise<DevnetVerdict>>();

/**
 * "Verify it yourself": asks Solana devnet for the anchor transaction and compares its memo root with
 * the root this page shows. Runs only when the visitor presses the button.
 */
@Component({
  selector: 'app-chain-verify',
  standalone: true,
  imports: [HashChip, TruthChip, When],
  template: `
    <div class="cv" [class.cv--done]="verdict()" data-testid="chain-verify">
      <div class="cv__head">
        <div>
          <h3 class="cv__title">Verify it yourself</h3>
          <p class="cv__lede">Your browser asks Solana devnet directly, not our server, for the anchor transaction, reads its memo and compares the root.</p>
        </div>
        <button type="button" class="btn btn--chain" (click)="run()" [disabled]="busy()" data-testid="verify-devnet">
          @if (busy()) {
            <span class="cv__spin" aria-hidden="true"></span> Asking devnet…
          } @else {
            {{ verdict() ? 'Ask devnet again' : 'Verify on Solana devnet' }}
          }
        </button>
      </div>

      @if (verdict(); as v) {
        <ol class="cv__steps" aria-live="polite">
          <li class="cv__step" [class.is-bad]="v.state === 'unavailable'" style="--i: 0">
            <span class="cv__n" aria-hidden="true">1</span>
            <div>
              <p class="cv__what">getTransaction from <span class="mono">{{ host }}</span></p>
              @if (v.state === 'unavailable') {
                <p class="cv__detail">{{ v.reason }}</p>
              } @else {
                <p class="cv__detail">Finalized · <app-when [at]="blockTimeMs(v)" [slot]="v.slot" /></p>
              }
            </div>
          </li>
          @if (v.state === 'match' || v.state === 'mismatch') {
            <li class="cv__step" style="--i: 1">
              <span class="cv__n" aria-hidden="true">2</span>
              <div>
                <p class="cv__what">Memo written by the anchor</p>
                <p class="cv__detail mono cv__memo">ir/1 root=<app-hash [value]="v.memo.root" label="root from the memo" [head]="10" [tail]="10" />@if (v.memo.n !== null) {<span> n={{ v.memo.n }}</span>}</p>
              </div>
            </li>
            <li class="cv__step" [class.is-bad]="v.state === 'mismatch'" style="--i: 2">
              <span class="cv__n" aria-hidden="true">3</span>
              <div class="cv__cmp-wrap">
                <p class="cv__what">Compared with this event's root, 8 hex digits at a time</p>
                <div class="cv__cmp" role="table" aria-label="Root on Solana compared with the root of this event">
                  <div class="cv__row" role="row">
                    <span class="cv__lab" role="rowheader">Solana</span>
                    @for (g of memoGroups(); track $index) {
                      <span role="cell" class="cv__g mono" [class.eq]="g === eventGroups()[$index]" [style.--g]="$index">{{ g }}</span>
                    }
                  </div>
                  <div class="cv__row" role="row">
                    <span class="cv__lab" role="rowheader">This page</span>
                    @for (g of eventGroups(); track $index) {
                      <span role="cell" class="cv__g mono" [class.eq]="g === memoGroups()[$index]" [style.--g]="$index">{{ g }}</span>
                    }
                  </div>
                </div>
              </div>
            </li>
          }
        </ol>

        <p class="cv__verdict" [class]="'cv__verdict cv__verdict--' + v.state" data-testid="devnet-verdict" style="--i: 3">
          @switch (v.state) {
            @case ('match') {
              <svg class="tick" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" /><path d="M6 10.4l2.7 2.7L14.2 7.6" /></svg>
              <strong>Match</strong>
              <span>The root on Solana devnet is the root of this event. Checked live, in slot {{ slot(v.slot) }}.</span>
              <app-truth kind="onchain" />
            }
            @case ('mismatch') {
              <strong>No match</strong>
              <span>The memo on Solana carries a different root than this event.</span>
            }
            @case ('no-memo') {
              <strong>No anchor memo</strong>
              <span>The transaction exists but carries no anchor memo.</span>
            }
            @default {
              <strong>RPC unavailable — showing recorded result</strong>
              <span>Recorded: root <app-hash [value]="expectedRoot()" label="recorded root" /> in slot {{ slot(recordedSlot()) }}, verified by the service when the run was recorded.</span>
              <app-truth kind="recorded" />
            }
          }
        </p>
      }
    </div>
  `,
  styleUrl: './chain-verify.scss',
})
export class ChainVerify {
  readonly signature = input.required<string>();
  readonly expectedRoot = input.required<string>();
  readonly recordedSlot = input<number | null | undefined>(null);

  readonly busy = signal(false);
  readonly verdict = signal<DevnetVerdict | null>(null);
  readonly host = new URL(DEVNET_RPC).host;
  readonly slot = slotLabel;

  readonly eventGroups = computed(() => groups(this.expectedRoot()));
  readonly memoGroups = computed(() => {
    const v = this.verdict();
    return v && (v.state === 'match' || v.state === 'mismatch') ? groups(v.memo.root) : [];
  });

  blockTimeMs(v: DevnetVerdict): number | null {
    return 'blockTime' in v && v.blockTime !== null ? v.blockTime * 1000 : null;
  }

  async run(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const sig = this.signature();
    const fresh = this.verdict() !== null;
    if (fresh || !cache.has(sig)) cache.set(sig, verifyOnDevnet(sig, this.expectedRoot()));
    this.verdict.set(null);
    try {
      this.verdict.set(await cache.get(sig)!);
    } finally {
      this.busy.set(false);
    }
  }
}
