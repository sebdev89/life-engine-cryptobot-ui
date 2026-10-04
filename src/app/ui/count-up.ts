import { Component, ElementRef, OnDestroy, effect, inject, input, signal } from '@angular/core';
import { prefersReducedMotion } from './format';

/** ease-out cubic: fast start, gentle landing on the real value */
export function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/**
 * A number that counts up to its value once, when it scrolls into view. The final text is the exact
 * value from the data; reduced motion (or no IntersectionObserver) shows it directly.
 */
@Component({
  selector: 'app-count',
  standalone: true,
  template: `<span class="count" aria-hidden="true">{{ shown() }}</span><span class="sr-only">{{ final() }}</span>`,
  styles: `
    .count {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CountUp implements OnDestroy {
  readonly to = input.required<number>();
  readonly decimals = input<number>(0);
  readonly durationMs = input<number>(1100);

  readonly shown = signal('');
  private raf = 0;
  private io: IntersectionObserver | null = null;
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const to = this.to();
      this.shown.set(this.format(0));
      this.stop();
      if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined' || typeof requestAnimationFrame === 'undefined') {
        this.shown.set(this.format(to));
        return;
      }
      this.io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.io?.disconnect();
          this.run(to);
        }
      });
      this.io.observe(this.host.nativeElement);
    });
  }

  final(): string {
    return this.format(this.to());
  }

  private run(to: number): void {
    const start = performance.now();
    const d = this.durationMs();
    const tick = (now: number) => {
      const t = (now - start) / d;
      this.shown.set(this.format(to * easeOut(t)));
      if (t < 1) this.raf = requestAnimationFrame(tick);
      else this.shown.set(this.format(to));
    };
    this.raf = requestAnimationFrame(tick);
  }

  private format(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() });
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.io?.disconnect();
    this.io = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
