import { Component, ElementRef, HostListener, Injectable, effect, inject, signal, viewChild } from '@angular/core';
import { TPipe } from './i18n';

@Injectable({ providedIn: 'root' })
export class Shortcuts {
  readonly isOpen = signal(false);
  /** where focus goes back when the dialog closes */
  private opener: HTMLElement | null = null;

  open(): void {
    try {
      this.opener = document.activeElement as HTMLElement | null;
    } catch {
      this.opener = null;
    }
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.opener?.focus?.();
    this.opener = null;
  }
}

/** `?` anywhere (outside a text field) lists the keyboard shortcuts; Esc or the button closes it. */
@Component({
  selector: 'app-shortcuts',
  standalone: true,
  imports: [TPipe],
  template: `
    @if (sc.isOpen()) {
      <div class="sc__backdrop" (click)="sc.close()"></div>
      <section class="sc" role="dialog" aria-modal="true" aria-labelledby="sc-title" data-testid="shortcuts">
        <header class="sc__head">
          <h2 id="sc-title">{{ 'sc.title' | t }}</h2>
          <button type="button" class="sc__x" (click)="sc.close()" #closeBtn>{{ 'sc.close' | t }}</button>
        </header>
        <dl class="sc__list">
          <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>{{ 'sc.steps' | t }}</dd></div>
          <div><dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>{{ 'sc.ends' | t }}</dd></div>
          <div><dt><kbd>Tab</kbd></dt><dd>{{ 'sc.tab' | t }}</dd></div>
          <div><dt><kbd>?</kbd></dt><dd>{{ 'sc.help' | t }}</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>{{ 'sc.esc' | t }}</dd></div>
        </dl>
      </section>
    }
  `,
  styles: `
    .sc__backdrop {
      position: fixed;
      inset: 0;
      z-index: 70;
      background: rgba(0, 0, 0, 0.45);
    }
    .sc {
      position: fixed;
      z-index: 71;
      left: 50%;
      top: 50%;
      width: min(420px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      padding: 18px 20px;
      border-radius: var(--r-lg);
      border: 1px solid var(--glass-border);
      background: var(--glass-strong);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: var(--shadow-2);
    }
    .sc__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    h2 {
      margin: 0;
      font-size: var(--fs-md);
    }
    .sc__x {
      border: 1px solid var(--glass-border);
      border-radius: var(--r-pill);
      background: transparent;
      color: var(--text);
      padding: 4px 12px;
      cursor: pointer;
    }
    .sc__list {
      display: grid;
      gap: 8px;
      margin: 0;
    }
    .sc__list div {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 10px;
      align-items: baseline;
    }
    dt {
      white-space: nowrap;
    }
    dd {
      margin: 0;
      color: var(--text-2);
      font-size: var(--fs-sm);
    }
    kbd {
      padding: 1px 6px;
      border-radius: var(--r-sm);
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      font-size: var(--fs-xs);
    }
  `,
})
export class ShortcutsDialog {
  readonly sc = inject(Shortcuts);
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  constructor() {
    effect(() => {
      const b = this.closeBtn();
      if (b) queueMicrotask(() => b.nativeElement.focus());
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (this.sc.isOpen()) this.sc.close();
      else this.sc.open();
    } else if (e.key === 'Escape' && this.sc.isOpen()) {
      this.sc.close();
    } else if (e.key === 'Tab' && this.sc.isOpen()) {
      // one focusable control: keep focus inside the dialog
      e.preventDefault();
      this.closeBtn()?.nativeElement.focus();
    }
  }
}
