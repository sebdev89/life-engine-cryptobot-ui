# Réplica pública de CryptoBot — build PUBLIC_DEMO servido por nginx-unprivileged bajo /cryptobot/.
#
#   docker build -f docker/public-demo/Dockerfile -t cryptobot-public-demo:local .
#   docker run --rm --read-only --tmpfs /tmp -p 8080:8080 cryptobot-public-demo:local
#   → http://127.0.0.1:8080/cryptobot/
#
# El bundle no llama a ningún backend (src/app/public-demo/flag.ts): lee el snapshot versionado de
# una corrida real en devnet. El build falla si scripts/public-demo/check-dist.mjs encuentra algo
# que no debe llegar a un visitante, y poda los chunks del operador que nadie puede cargar.
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration public-demo \
 && node scripts/public-demo/og-pages.mjs dist/cryptobot-ui-public-demo/browser \
 && node scripts/public-demo/check-dist.mjs --prune dist/cryptobot-ui-public-demo/browser \
 && node scripts/public-demo/check-dist.mjs dist/cryptobot-ui-public-demo/browser

# nginx-unprivileged: escucha en 8080, uid 101, pid y caches en /tmp.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --chmod=0644 docker/public-demo/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=0644 docker/public-demo/security-headers.inc /etc/nginx/le-security-headers.inc
COPY --from=build /src/dist/cryptobot-ui-public-demo/browser/ /usr/share/nginx/html/cryptobot/
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.source="https://github.com/sebdev89/life-engine-cryptobot-ui" \
      org.opencontainers.image.description="CryptoBot public replay (read-only, Solana devnet)" \
      org.opencontainers.image.licenses="Apache-2.0" \
      life-engine.ui.app="cryptobot-public-demo" \
      life-engine.commit="${GIT_COMMIT}"
USER 101
EXPOSE 8080
