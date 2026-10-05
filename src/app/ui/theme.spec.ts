import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_THEME, THEME_KEY, ThemeService, initialTheme } from './theme';

describe('theme', () => {
  afterEach(() => {
    try {
      localStorage.removeItem(THEME_KEY);
    } catch {
      // ignore
    }
    delete document.documentElement.dataset['theme'];
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('defaults to dark, whatever is stored that is not a valid pick', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(initialTheme(null)).toBe('dark');
    expect(initialTheme('purple')).toBe('dark');
    expect(initialTheme('light')).toBe('light');
  });

  it('ignores prefers-color-scheme: light on first visit', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('light'), media: q }) as MediaQueryList);
    const t = TestBed.inject(ThemeService);
    expect(t.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('the toggle switches and remembers the pick', () => {
    const t = TestBed.inject(ThemeService);
    t.toggle();
    expect(t.theme()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    TestBed.resetTestingModule();
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('works when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    const t = TestBed.inject(ThemeService);
    expect(t.theme()).toBe('dark');
    expect(() => t.toggle()).not.toThrow();
    expect(t.theme()).toBe('light');
  });
});
