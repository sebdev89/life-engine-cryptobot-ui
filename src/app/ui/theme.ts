import { Injectable, signal } from '@angular/core';
import { readPref, writePref } from './storage';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'cb.theme';

function systemTheme(): Theme {
  try {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Follows the system until the visitor picks one; the pick is remembered in this browser. The CSS reads
 * `:root[data-theme]` (explicit) or `prefers-color-scheme` (no pick).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly pref = signal<Theme | null>(((v) => (v === 'light' || v === 'dark' ? v : null))(readPref(THEME_KEY)));
  readonly theme = signal<Theme>(this.pref() ?? systemTheme());

  constructor() {
    this.apply();
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.pref.set(next);
    this.theme.set(next);
    writePref(THEME_KEY, next);
    this.apply();
  }

  private apply(): void {
    try {
      const p = this.pref();
      if (p) document.documentElement.dataset['theme'] = p;
      else delete document.documentElement.dataset['theme'];
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.theme() === 'light' ? '#f3f6fa' : '#07090d');
    } catch {
      // no DOM
    }
  }
}
