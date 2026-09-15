/**
 * Thin client for life-engine-auth's `POST /api/auth/login`. The whole point of
 * this file is to reuse the existing Auth backend — no parallel auth system,
 * no token issuing here. We translate the LoginResponse DTO into the
 * `CryptobotSession` shape that session.ts persists.
 */
import type { CryptobotSession } from './session';
import { uiConfig } from './config';

/** Kept for callers that display it; the live value always comes from uiConfig(). */
export const AUTH_API_BASE = uiConfig().authBase;

interface AuthLoginResponseDto {
  accessToken: string;
  tokenType?: string;
  expiresInSeconds?: number;
  refreshToken?: string;
  refreshExpiresInSeconds?: number;
}

export interface LoginErrorBody {
  status: number;
  code?: string;
  message: string;
}

/**
 * POSTs to /api/auth/login and returns a CryptobotSession ready for
 * setCryptobotSession(). On non-2xx, throws an Error annotated with a
 * structured { loginError } so the UI can show a friendly message.
 */
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<CryptobotSession> {
  const res = await fetch(`${uiConfig().authBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let message = `Login failed (HTTP ${res.status})`;
    let code: string | undefined;
    try {
      const raw = await res.text();
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string; message?: string };
        if (parsed?.message) message = parsed.message;
        if (parsed?.code) code = parsed.code;
      }
    } catch {
      /* keep default message */
    }
    const loginError: LoginErrorBody = { status: res.status, code, message };
    throw Object.assign(new Error(message), { loginError });
  }

  const body = (await res.json()) as AuthLoginResponseDto;
  if (!body.accessToken) {
    throw new Error('Login response missing accessToken');
  }

  // expiresInSeconds is a TTL relative to now — convert to absolute epoch ms
  // so session.ts can compare directly against Date.now().
  const expiresAtMs =
    typeof body.expiresInSeconds === 'number' && body.expiresInSeconds > 0
      ? Date.now() + body.expiresInSeconds * 1000
      : undefined;

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresAtMs,
  };
}
