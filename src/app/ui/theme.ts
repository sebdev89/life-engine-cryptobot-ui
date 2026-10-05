import { Injectable, signal } from '@angular/core';
import { readPref, writePref } from './storage';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'cb.theme';

/** The brand is dark: that is the default whatever the OS prefers (prefers-color-scheme is ignored on purpose). */
export const DEFAULT_THEME: Theme = 'dark';

/** The stored pick, or the default. Storage may be missing or throw: readPref already falls back to null. */
export function initialTheme(stored: string | null): Theme {
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
}

/**
 * Dark by default; the toggle switches and the pick is remembered in this browser (localStorage, try/catch).
 * The CSS reads `:root[data-theme='light']`; without it the dark tokens of :root apply.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(initialTheme(readPref(THEME_KEY)));

  constructor() {
    this.apply();
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    writePref(THEME_KEY, next);
    this.apply();
  }

  private apply(): void {
    try {
      document.documentElement.dataset['theme'] = this.theme();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.theme() === 'light' ? '#f3f6fa' : '#07090d');
    } catch {
      // no DOM
    }
  }
}
