# Dockerfile generik untuk layanan Node di monorepo ini.
# Dipakai oleh market-service, user-service, alert-worker, dan mock-upstream
# lewat build-arg SERVICE (nama folder di services/).
#
# Build dari ROOT repo:
#   docker build -f infra/docker/node-service.Dockerfile --build-arg SERVICE=market-service -t fxpulse/market-service .

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS deps
ARG SERVICE
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY services/${SERVICE}/package.json services/${SERVICE}/
# Instal hanya workspace yang dibutuhkan (lockfile root dipakai agar versi konsisten).
RUN npm ci --no-audit --no-fund -w packages/shared -w services/${SERVICE} --include-workspace-root

FROM deps AS build
ARG SERVICE
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY services/${SERVICE} services/${SERVICE}
RUN npm run build -w packages/shared && npm run build -w services/${SERVICE} \
  && npm prune --omit=dev --no-audit --no-fund \
  && mkdir -p services/${SERVICE}/node_modules packages/shared/node_modules

FROM node:${NODE_VERSION}-alpine AS runtime
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache curl && addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=app:app /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=app:app /app/services/${SERVICE}/package.json ./services/${SERVICE}/package.json
COPY --from=build --chown=app:app /app/services/${SERVICE}/dist ./services/${SERVICE}/dist
# node_modules lokal workspace (ada jika npm memisahkan versi yang konflik; bisa kosong).
COPY --from=build --chown=app:app /app/services/${SERVICE}/node_modules ./services/${SERVICE}/node_modules
COPY --from=build --chown=app:app /app/packages/shared/node_modules ./packages/shared/node_modules
# node_modules/@fxpulse/shared adalah symlink relatif ke ../../packages/shared (dibuat npm workspaces).
USER app
WORKDIR /app/services/${SERVICE}
CMD ["node", "dist/main.js"]
