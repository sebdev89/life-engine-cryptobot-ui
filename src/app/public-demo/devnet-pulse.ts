import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { devnetSlot } from '../value/devnet-verify';
import { slotLabel } from '../ui/format';
import { TPipe } from '../ui/i18n';

const EVERY_MS = 10_000;

/**
 * The one live thing on a recorded page: devnet's current slot, read every ~10 s from the public RPC
 * while the tab is visible. If devnet does not answer it disappears quietly (the replay does not need it).
 */
@Component({
  selector: 'app-devnet-pulse',
  standalone: true,
  imports: [TPipe],
  template: `
    @if (slot(); as s) {
      <span class="pulse" data-testid="devnet-pulse" [title]="'net.title' | t">
        <span class="pulse__dot" [attr.data-beat]="beat()" aria-hidden="true"></span>
        {{ 'net.live' | t }} <span class="mono">{{ label(s) }}</span>
        <span class="pulse__ago">· {{ 'net.ago' | t: { s: ago() } }}</span>
      </span>
    }
  `,
  styles: `
    .pulse {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .pulse__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--chain-2);
      animation: beat 900ms var(--ease);
    }
    .pulse__dot[data-beat='1'] {
      animation-name: beat-b;
    }
    @keyframes beat {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--chain-2) 70%, transparent);
      }
      100% {
        box-shadow: 0 0 0 7px transparent;
      }
    }
    @keyframes beat-b {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--chain-2) 70%, transparent);
      }
      100% {
        box-shadow: 0 0 0 7px transparent;
      }
    }
    .pulse__ago {
      color: var(--text-3);
    }
  `,
})
export class DevnetPulse implements OnInit, OnDestroy {
  readonly slot = signal<number | null>(null);
  readonly readAt = signal<number>(0);
  readonly now = signal<number>(Date.now());
  /** flips on each new reading so the dot pulses again */
  readonly beat = signal(0);
  readonly ago = computed(() => Math.max(0, Math.round((this.now() - this.readAt()) / 1000)));
  readonly label = slotLabel;

  private poll: ReturnType<typeof setInterval> | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;
  private failures = 0;
  private readonly onVisibility = () => {
    if (!document.hidden) void this.read();
  };

  ngOnInit(): void {
    void this.read();
    this.poll = setInterval(() => {
      if (!document.hidden) void this.read();
    }, EVERY_MS);
    this.clock = setInterval(() => {
      if (!document.hidden) this.now.set(Date.now());
    }, 1000);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private async read(): Promise<void> {
    if (this.failures >= 3) return;
    const s = await devnetSlot();
    if (s === null) {
      this.failures++;
      if (this.failures >= 3) this.slot.set(null);
      return;
    }
    this.failures = 0;
    this.slot.set(s);
    this.readAt.set(Date.now());
    this.now.set(Date.now());
    this.beat.set(this.beat() ? 0 : 1);
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
    if (this.clock) clearInterval(this.clock);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
