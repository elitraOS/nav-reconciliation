FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/nav-engine/package.json packages/nav-engine/
COPY packages/injectors/package.json packages/injectors/
COPY packages/normalizer/package.json packages/normalizer/
COPY packages/registry/package.json packages/registry/
COPY prisma/ prisma/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm turbo run build --filter=@nav-reconciliation/api

# Production
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
