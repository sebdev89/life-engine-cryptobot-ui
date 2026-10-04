import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { readPref, writePref } from './storage';
import { DICT, Lang } from './i18n-dict';

export type { Lang } from './i18n-dict';
export const LANG_KEY = 'cb.lang';

/** `{name}` placeholders filled from params; a missing key falls back to English, then to the key. */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>, fallback?: string): string {
  const raw = DICT[lang]?.[key] ?? DICT.en[key] ?? fallback ?? key;
  return params ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : raw;
}

/**
 * English by default (the jury reads English); Spanish on request, remembered per visitor. The narrative
 * surfaces are translated (shell, landing, replay, onboarding, verification, use cases); data screens keep
 * the service's own English terms.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(readPref(LANG_KEY) === 'es' ? 'es' : 'en');

  constructor() {
    this.apply();
  }

  set(l: Lang): void {
    this.lang.set(l);
    writePref(LANG_KEY, l === 'en' ? null : l);
    this.apply();
  }

  t(key: string, params?: Record<string, string | number>): string {
    return translate(this.lang(), key, params);
  }

  private apply(): void {
    try {
      document.documentElement.lang = this.lang();
    } catch {
      // no document (tests without DOM)
    }
  }
}

/** `{{ 'tour.play' | t }}` — re-evaluates when the language changes (reads the signal). */
@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(key: string, params?: Record<string, string | number>, fallback?: string): string {
    return translate(this.i18n.lang(), key, params, fallback);
  }
}
