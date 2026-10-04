import { Component, HostListener, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { getProposal, listAllProposals } from '../control-plane-api';
import { getDistribution, getIdentity, getValueEvent, listRevenueEvents, listValueEvents, getRevenueEvent, ValueEvent } from '../value-events-api';
import { TopNav } from '../shell/top-nav';
import { ChainRail } from '../pov/chain-rail';
import { POV_CHAIN, clampStep } from '../pov/pov-chain';
import { ChainVerify } from '../value/chain-verify';
import { ExtIcon, HashChip } from '../ui/hash';
import { TruthChip } from '../ui/truth';
import { When } from '../ui/when';
import { prefersReducedMotion } from '../ui/format';
import { STEP_MS, TourData, TourStep, buildTour } from './tour-model';
import { I18n, TPipe } from '../ui/i18n';

const TICK_MS = 100;

/** newest anchored outcome, preferring one whose reward was distributed */
function pickEvent(events: readonly ValueEvent[]): ValueEvent | null {
  const anchored = events.filter((e) => e.status === 'ANCHORED');
  return anchored.find((e) => e.distribution) ?? anchored[0] ?? null;
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * `/tour?step=N`: the run replayed as nine steps. ← / → move, Play walks it in 90 s (10 s a step) and
 * can be paused at any point; the URL always names the step on screen, so it can be shared.
 */
@Component({
  selector: 'app-tour',
  standalone: true,
  imports: [RouterLink, TopNav, ChainRail, ChainVerify, HashChip, ExtIcon, TruthChip, When, TPipe],
  templateUrl: './tour.html',
  styleUrl: './tour.scss',
})
export class Tour implements OnDestroy {
  /** query params (component input binding) */
  readonly step = input<string | undefined>();
  readonly autoplay = input<string | undefined>();

  readonly total = POV_CHAIN.length;
  readonly current = signal(1);
  readonly playing = signal(false);
  /** 0…1 inside the current step while playing */
  readonly stepProgress = signal(0);
  private readonly i18n = inject(I18n);
  private readonly data = signal<TourData | null>(null);
  /** rebuilt when the language changes; the values themselves never change */
  readonly steps = computed<TourStep[] | null>(() => {
    const d = this.data();
    this.i18n.lang();
    return d ? buildTour(d, (k, p) => this.i18n.t(k, p)) : null;
  });
  readonly error = signal<string | null>(null);

  readonly view = computed(() => this.steps()?.[this.current() - 1] ?? null);
  /** where the scrubber fill ends: aligned with the thumb (step 1 = left edge, step 9 = right edge) */
  readonly overall = computed(() => Math.min(1, (this.current() - 1 + this.stepProgress()) / (this.total - 1)));
  readonly elapsedLabel = computed(() => clock(((this.current() - 1) + this.stepProgress()) * STEP_MS));
  readonly totalLabel = clock(POV_CHAIN.length * STEP_MS);
  readonly announce = computed(() => this.i18n.t('tour.announce', { n: this.current(), total: this.total, name: POV_CHAIN[this.current() - 1].name }));

  private readonly router = inject(Router);
  private timer: ReturnType<typeof setInterval> | null = null;
  private autoStarted = false;

  constructor() {
    effect(() => {
      const s = clampStep(this.step());
      untracked(() => {
        if (s !== this.current()) {
          this.current.set(s);
          this.stepProgress.set(0);
        }
      });
    });
    effect(() => {
      const a = this.autoplay();
      untracked(() => {
        if (a === '1' && !this.autoStarted && !prefersReducedMotion()) {
          this.autoStarted = true;
          this.play();
        }
      });
    });
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const [proposals, events] = await Promise.all([listAllProposals(5).catch(() => []), listValueEvents(20).catch(() => [])]);
      const prop = proposals.find((p) => p.status === 'EXECUTED') ?? proposals[0] ?? null;
      const picked = pickEvent(events);
      const [full, ev] = await Promise.all([prop ? getProposal(prop.id).catch(() => null) : null, picked ? getValueEvent(picked.id).catch(() => picked) : null]);
      const revId = ev?.revenueShares?.[0]?.revenueEventId ?? null;
      const agent = ev?.contributions.find((c) => c.kind === 'AGENT') ?? ev?.contributions[0] ?? null;
      const [distribution, revenue, identity] = await Promise.all([
        ev?.distribution ? getDistribution(ev.id).catch(() => null) : null,
        revId ? getRevenueEvent(revId).catch(() => null) : listRevenueEvents().then((r) => r[0] ?? null).catch(() => null),
        agent ? getIdentity(agent.identityId).catch(() => null) : null,
      ]);
      const data: TourData = { proposal: full?.proposal ?? prop, audit: full?.audit ?? [], event: ev, distribution, revenue, identity };
      if (!data.proposal && !data.event) {
        this.error.set(this.i18n.t('tour.error'));
        return;
      }
      this.data.set(data);
    } catch (e) {
      this.error.set(`${this.i18n.t('tour.error')} ${(e as Error)?.message ?? e}`);
    }
  }

  go(n: number, fromPlayer = false): void {
    const s = clampStep(n);
    if (!fromPlayer) this.stepProgress.set(0);
    this.current.set(s);
    void this.router.navigate([], { queryParams: { step: s, autoplay: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  prev(): void {
    if (this.current() > 1) this.go(this.current() - 1);
  }

  next(): void {
    if (this.current() < this.total) this.go(this.current() + 1);
  }

  toggle(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  play(): void {
    if (this.current() === this.total && this.stepProgress() >= 1) this.go(1);
    this.playing.set(true);
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  pause(): void {
    this.playing.set(false);
    this.stopTimer();
  }

  scrub(ev: Event): void {
    this.go(Number((ev.target as HTMLInputElement).value));
  }

  private tick(): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    const p = this.stepProgress() + TICK_MS / STEP_MS;
    if (p < 1) {
      this.stepProgress.set(p);
      return;
    }
    if (this.current() < this.total) {
      this.stepProgress.set(0);
      this.go(this.current() + 1, true);
    } else {
      this.stepProgress.set(1);
      this.pause();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.go(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.go(this.total);
    }
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  unitsPct(units: number, total: number): number {
    return total > 0 ? Math.round((units / total) * 1000) / 10 : 0;
  }
}
