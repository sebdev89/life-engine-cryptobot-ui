/**
 * Per-visitor conveniences only (onboarding seen, theme, language). Storage can be missing or throw
 * (private windows, blocked site data): every read falls back to the default, every write is optional.
 */
export function readPref(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // not stored; the page works the same
  }
}
