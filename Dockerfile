# cryptobot-ui — static Angular build served by nginx; backend URLs injected at start via config.js.
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY --from=build /src/dist/cryptobot-ui/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /docker-entrypoint.d/40-cryptobot-config.sh
RUN chmod +x /docker-entrypoint.d/40-cryptobot-config.sh
EXPOSE 80
