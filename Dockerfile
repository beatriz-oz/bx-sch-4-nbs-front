# The site image: builds both languages (/en and /pt-PT) and serves them with Caddy.
# Caddy's configuration (HTTPS, the /v1 proxy, the language at "/") is the Caddyfile of the
# deploy, in the back end repository (deploy/Caddyfile), mounted when the container starts.

# 1. Build (Node is only needed here, not in the final image).
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# 2. Serve: only the built files.
FROM caddy:2-alpine
COPY --from=build /app/dist/bx-sch-4-nbs-front/browser /srv
