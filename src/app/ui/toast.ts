import { Component, Injectable, inject, signal } from '@angular/core';

/** One short confirmation at a time ("Copied transaction signature"); it leaves by itself. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  readonly current = signal<{ id: number; text: string } | null>(null);
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, ms = 2200): void {
    if (this.timer) clearTimeout(this.timer);
    this.current.set({ id: ++this.seq, text });
    this.timer = setTimeout(() => this.current.set(null), ms);
  }
}

/** Mounted once in the shell. The live region exists from the first paint so screen readers hear the change. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-region" role="status" aria-live="polite">
      @if (toasts.current(); as t) {
        <p class="toast" [attr.data-id]="t.id">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {{ t.text }}
        </p>
      }
    </div>
  `,
  styles: `
    .toast-region {
      position: fixed;
      z-index: 50;
      left: 50%;
      bottom: max(16px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      pointer-events: none;
    }
    .toast {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 8px 14px;
      border-radius: var(--r-pill);
      border: 1px solid var(--glass-border);
      background: var(--glass-strong);
      backdrop-filter: blur(var(--blur)) saturate(140%);
      -webkit-backdrop-filter: blur(var(--blur)) saturate(140%);
      box-shadow: var(--shadow-2);
      color: var(--text);
      font-size: var(--fs-sm);
      white-space: nowrap;
      animation: toast-in var(--dur) var(--ease);
    }
    .toast svg {
      color: var(--ok);
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
  `,
})
export class ToastHost {
  readonly toasts = inject(Toasts);
}
