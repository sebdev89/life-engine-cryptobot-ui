#!/bin/sh
# Writes the runtime config the app reads before bootstrapping (see src/app/config.ts).
cat > /usr/share/nginx/html/config.js <<CFG
window.__CRYPTOBOT_CONFIG__ = {
  authBase: '${UI_AUTH_BASE:-http://localhost:8081}',
  cryptobotBase: '${UI_CRYPTOBOT_BASE:-http://localhost:8091}',
  demoCluster: '${UI_DEMO_CLUSTER:-devnet}',
  demoWallet: '${UI_DEMO_WALLET:-}' || undefined
};
CFG
