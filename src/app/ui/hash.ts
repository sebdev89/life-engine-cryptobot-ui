import { Component, computed, inject, input } from '@angular/core';
import { Toasts } from './toast';
import { middle } from './format';

/** Copies text; falls back to a hidden textarea where the async clipboard is not allowed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** The arrow-out-of-box icon every link that leaves the page carries (opens in a new tab). */
@Component({
  selector: 'app-ext-icon',
  standalone: true,
  template: `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V13H3V5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="sr-only"> (opens in a new tab)</span>`,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: -1px;
      margin-left: 3px;
      opacity: 0.85;
    }
  `,
})
export class ExtIcon {}

/**
 * A hash, signature or address: monospace, elided in the middle (both ends stay checkable), the full
 * value in the tooltip and for screen readers, one button to copy it. With `href`, the value is the
 * link to Solana Explorer, in a new tab.
 */
@Component({
  selector: 'app-hash',
  standalone: true,
  imports: [ExtIcon],
  template: `
    <span class="hash">
      @if (href(); as h) {
        <a class="hash__v mono" [href]="h" target="_blank" rel="noopener noreferrer" [title]="value()"
          ><span aria-hidden="true">{{ shown() }}</span><span class="sr-only">{{ label() }} {{ value() }} on Solana Explorer</span><app-ext-icon
        /></a>
      } @else {
        <span class="hash__v mono" [title]="value()"><span aria-hidden="true">{{ shown() }}</span><span class="sr-only">{{ value() }}</span></span>
      }
      <button type="button" class="hash__copy" (click)="copy()" [attr.aria-label]="'Copy ' + label()" [title]="'Copy ' + label()">
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
      </button>
    </span>
  `,
  styles: `
    :host {
      display: inline;
      min-width: 0;
    }
    .hash {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      max-width: 100%;
      vertical-align: middle;
    }
    .hash__v {
      font-size: 0.94em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    a.hash__v {
      display: inline-flex;
      align-items: center;
    }
    .hash__copy {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--r-md);
      background: transparent;
      color: var(--text-3);
      cursor: pointer;
      transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
    }
    .hash__copy:hover {
      color: var(--text);
      background: var(--glass-hover);
      border-color: var(--glass-border);
    }
  `,
})
export class HashChip {
  readonly value = input.required<string>();
  /** what it is, in words: "transaction signature", "Merkle root" — used by the copy button and the toast */
  readonly label = input<string>('value');
  readonly href = input<string | null | undefined>(null);
  readonly head = input<number>(8);
  readonly tail = input<number>(8);

  readonly shown = computed(() => middle(this.value(), this.head(), this.tail()));
  private readonly toasts = inject(Toasts);

  async copy(): Promise<void> {
    const ok = await copyText(this.value());
    const l = this.label();
    this.toasts.show(ok ? `Copied ${l}` : `Could not copy the ${l}; select it instead`);
  }
}
