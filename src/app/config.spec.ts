import { afterEach, describe, expect, it } from 'vitest';
import { uiConfig } from './config';

describe('uiConfig', () => {
  afterEach(() => {
    delete window.__CRYPTOBOT_CONFIG__;
    delete window.__CRYPTOBOT_ENV;
  });

  it('falls back to the local dev defaults', () => {
    expect(uiConfig()).toEqual({
      authBase: 'http://localhost:8081',
      cryptobotBase: 'http://localhost:8091',
      demoCluster: 'devnet',
    });
  });

  it('reads config.js and strips the trailing slash', () => {
    window.__CRYPTOBOT_CONFIG__ = { cryptobotBase: 'https://cb.example/', demoWallet: 'W1' };
    const c = uiConfig();
    expect(c.cryptobotBase).toBe('https://cb.example');
    expect(c.demoWallet).toBe('W1');
  });

  it('lets the platform image global (__CRYPTOBOT_ENV) win over config.js', () => {
    window.__CRYPTOBOT_CONFIG__ = { authBase: 'http://a', cryptobotBase: 'http://b' };
    window.__CRYPTOBOT_ENV = { cryptobotBase: 'https://uat.example/' };
    const c = uiConfig();
    expect(c.authBase).toBe('http://a');
    expect(c.cryptobotBase).toBe('https://uat.example');
  });
});
