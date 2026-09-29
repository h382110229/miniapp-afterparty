FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types ./packages/shared-types
COPY apps/game-card-highlow ./apps/game-card-highlow

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @afterparty/shared-types build
RUN pnpm --filter @afterparty/game-card-highlow build

FROM --platform=linux/arm64 node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/dist ./packages/shared-types/dist
COPY apps/game-card-highlow/package.json ./apps/game-card-highlow/
COPY apps/game-card-highlow/dist ./apps/game-card-highlow/dist

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile=false

CMD ["node", "apps/game-card-highlow/dist/index.js"]
