/**
 * Mirror of life-engine-runtime-ui session helper. We use a distinct localStorage key
 * (`life-engine-cryptobot.session`) so the two apps don't trample each other when sharing the
 * `localhost` parent origin. Same query-string bootstrap contract — see
 * docs/extraction/service-boundaries.md §4 and contracts.md §5.
 */

import { PUBLIC_DEMO } from './public-demo/flag';

const STORAGE_KEY = 'life-engine-cryptobot.session';

/**
 * Public replay build: there is nothing to sign in to. Screens see this constant "session" so
 * they render their data instead of the token gate; it is never sent anywhere (apiFetch answers
 * from the snapshot) and nothing is read from the URL or written to localStorage.
 */
const REPLAY_SESSION: CryptobotSession = { accessToken: 'public-replay-no-credential' };

export interface CryptobotSession {
  accessToken: string;
  refreshToken?: string;
  expiresAtMs?: number;
}

let cached: CryptobotSession | null = null;

function readQueryToken(): CryptobotSession | null {
  if (typeof window === 'undefined' || !window.location.search) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const access = params.get('token');
  if (!access || access.length < 16) {
    return null;
  }
  const refresh = params.get('refresh') ?? undefined;
  const expSec = Number.parseInt(params.get('exp') ?? '0', 10);
  const session: CryptobotSession = {
    accessToken: access,
    refreshToken: refresh,
    expiresAtMs: Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : undefined,
  };
  params.delete('token');
  params.delete('refresh');
  params.delete('exp');
  const remaining = params.toString();
  const newUrl =
    window.location.pathname + (remaining ? `?${remaining}` : '') + window.location.hash;
  window.history.replaceState(null, '', newUrl);
  return session;
}

function readStoredSession(): CryptobotSession | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CryptobotSession;
    if (!parsed.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(session: CryptobotSession | null): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function bootstrapSessionFromQuery(): CryptobotSession | null {
  if (PUBLIC_DEMO) return REPLAY_SESSION;
  const fromQuery = readQueryToken();
  if (fromQuery) {
    persist(fromQuery);
    cached = fromQuery;
    return fromQuery;
  }
  if (!cached) {
    cached = readStoredSession();
  }
  return cached;
}

export function getCryptobotSession(): CryptobotSession | null {
  if (PUBLIC_DEMO) return REPLAY_SESSION;
  if (!cached) {
    cached = readStoredSession();
  }
  return cached;
}

export function getAccessToken(): string | null {
  return getCryptobotSession()?.accessToken ?? null;
}

export function setCryptobotSession(session: CryptobotSession): void {
  if (PUBLIC_DEMO) return;
  cached = session;
  persist(session);
}

export function clearCryptobotSession(): void {
  if (PUBLIC_DEMO) return;
  cached = null;
  persist(null);
}

export function authorizationHeaders(): Record<string, string> {
  if (PUBLIC_DEMO) return {};
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
