import { Component, computed, input, signal } from '@angular/core';
import { HashChip } from '../ui/hash';
import { TruthChip } from '../ui/truth';
import { When } from '../ui/when';
import { slotLabel } from '../ui/format';
import { DEVNET_RPC, DevnetVerdict, groups, verifyOnDevnet } from './devnet-verify';
import { TPipe } from '../ui/i18n';
import { middle } from '../ui/format';

/** One answer per signature and page load: a second click does not hit devnet again. */
const cache = new Map<string, Promise<DevnetVerdict>>();

/**
 * "Verify it yourself": asks Solana devnet for the anchor transaction and compares its memo root with
 * the root this page shows. Runs only when the visitor presses the button.
 */
@Component({
  selector: 'app-chain-verify',
  standalone: true,
  imports: [HashChip, TruthChip, When, TPipe],
  template: `
    <div class="cv" [class.cv--done]="verdict()" data-testid="chain-verify">
      <div class="cv__head">
        <div>
          <h3 class="cv__title">{{ 'cv.title' | t }}</h3>
          <p class="cv__lede">{{ 'cv.lede' | t }}</p>
        </div>
        <button type="button" class="btn btn--chain" (click)="run()" [disabled]="busy()" data-testid="verify-devnet">
          @if (busy()) {
            <span class="cv__spin" aria-hidden="true"></span> {{ 'cv.busy' | t }}
          } @else {
            {{ (verdict() ? 'cv.again' : 'cv.go') | t }}
          }
        </button>
      </div>

      @if (verdict(); as v) {
        <ol class="cv__steps" aria-live="polite">
          <li class="cv__step" [class.is-bad]="v.state === 'unavailable'" style="--i: 0">
            <span class="cv__n" aria-hidden="true">1</span>
            <div>
              <p class="cv__what">{{ 'cv.s1' | t: { host: host } }}</p>
              @if (v.state === 'unavailable') {
                <p class="cv__detail">{{ v.reason }}</p>
              } @else {
                <p class="cv__detail">{{ 'cv.finalized' | t }} · <app-when [at]="blockTimeMs(v)" [slot]="v.slot" /></p>
              }
            </div>
          </li>
          @if (v.state === 'match' || v.state === 'mismatch') {
            <li class="cv__step" style="--i: 1">
              <span class="cv__n" aria-hidden="true">2</span>
              <div>
                <p class="cv__what">{{ 'cv.s2' | t }}</p>
                <p class="cv__detail mono cv__memo">ir/1 root=<app-hash [value]="v.memo.root" label="root from the memo" [head]="10" [tail]="10" />@if (v.memo.n !== null) {<span> n={{ v.memo.n }}</span>}</p>
              </div>
            </li>
            <li class="cv__step" [class.is-bad]="v.state === 'mismatch'" style="--i: 2">
              <span class="cv__n" aria-hidden="true">3</span>
              <div class="cv__cmp-wrap">
                <p class="cv__what">{{ 'cv.s3' | t }}</p>
                <div class="cv__cmp" role="table" aria-label="Root on Solana compared with the root of this event">
                  <div class="cv__row" role="row">
                    <span class="cv__lab" role="rowheader">{{ 'cv.row.solana' | t }}</span>
                    @for (g of memoGroups(); track $index) {
                      <span role="cell" class="cv__g mono" [class.eq]="g === eventGroups()[$index]" [style.--g]="$index">{{ g }}</span>
                    }
                  </div>
                  <div class="cv__row" role="row">
                    <span class="cv__lab" role="rowheader">{{ 'cv.row.page' | t }}</span>
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
              <strong>{{ 'cv.match' | t }}</strong>
              <span>{{ 'cv.match.body' | t: { slot: slot(v.slot) } }}</span>
              <app-truth kind="onchain" />
            }
            @case ('mismatch') {
              <strong>{{ 'cv.mismatch' | t }}</strong>
              <span>{{ 'cv.mismatch.body' | t }}</span>
            }
            @case ('no-memo') {
              <strong>{{ 'cv.nomemo' | t }}</strong>
              <span>{{ 'cv.nomemo.body' | t }}</span>
            }
            @default {
              <strong>{{ 'cv.down' | t }}</strong>
              <span>{{ 'cv.down.body' | t: { root: mid(expectedRoot()), slot: slot(recordedSlot()) } }}</span>
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
  readonly mid = (h: string) => middle(h, 8, 8);

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
