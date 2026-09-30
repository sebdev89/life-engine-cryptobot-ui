/**
 * Base URLs of the backends the UI talks to. Defaults match the local dev stack; a deployment
 * overrides them without rebuilding by defining `window.__CRYPTOBOT_CONFIG__` before the app
 * bundle loads (see `index.html` → `config.js`, which nginx can serve per environment).
 *
 * The platform image (reusable `ui-image` workflow, KAN-799) injects its config inline in
 * `index.html` as `window.__CRYPTOBOT_ENV = {...}` (UI_ENV_GLOBAL/UI_ENV_JSON of `40-ui-env.sh`).
 * Both are read; `__CRYPTOBOT_ENV` wins over `config.js` because it is the per-environment one.
 */
export interface CryptobotUiConfig {
  authBase: string;
  cryptobotBase: string;
  demoWallet?: string;
  demoCluster?: string;
}

declare global {
  interface Window {
    __CRYPTOBOT_CONFIG__?: Partial<CryptobotUiConfig>;
    __CRYPTOBOT_ENV?: Partial<CryptobotUiConfig>;
  }
}

const DEFAULTS: CryptobotUiConfig = {
  authBase: 'http://localhost:8081',
  cryptobotBase: 'http://localhost:8091',
  demoCluster: 'devnet',
};

export function uiConfig(): CryptobotUiConfig {
  const w = typeof window !== 'undefined' ? window : undefined;
  const merged = { ...DEFAULTS, ...(w?.__CRYPTOBOT_CONFIG__ ?? {}), ...(w?.__CRYPTOBOT_ENV ?? {}) };
  return {
    ...merged,
    authBase: merged.authBase.replace(/\/$/, ''),
    cryptobotBase: merged.cryptobotBase.replace(/\/$/, ''),
  };
}
