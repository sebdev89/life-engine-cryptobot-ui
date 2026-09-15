/**
 * Base URLs of the backends the UI talks to. Defaults match the local dev stack; a deployment
 * overrides them without rebuilding by defining `window.__CRYPTOBOT_CONFIG__` before the app
 * bundle loads (see `index.html` → `config.js`, which nginx can serve per environment).
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
  }
}

const DEFAULTS: CryptobotUiConfig = {
  authBase: 'http://localhost:8081',
  cryptobotBase: 'http://localhost:8091',
  demoCluster: 'devnet',
};

export function uiConfig(): CryptobotUiConfig {
  const override = typeof window !== 'undefined' ? window.__CRYPTOBOT_CONFIG__ ?? {} : {};
  const merged = { ...DEFAULTS, ...override };
  return {
    ...merged,
    authBase: merged.authBase.replace(/\/$/, ''),
    cryptobotBase: merged.cryptobotBase.replace(/\/$/, ''),
  };
}
