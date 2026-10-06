FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types ./packages/shared-types
COPY apps/gateway ./apps/gateway

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @afterparty/shared-types build
RUN pnpm --filter @afterparty/gateway build

FROM --platform=linux/arm64 node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY apps/gateway/package.json ./apps/gateway/
COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist
COPY apps/client/dist/build/h5 ./apps/client/dist/build/h5

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile=false

EXPOSE 4000

CMD ["node", "apps/gateway/dist/index.js"]
