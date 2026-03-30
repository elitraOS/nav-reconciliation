FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/
RUN pnpm turbo run build --filter=@nav-reconciliation/frontend

# Production
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Copy public assets if they exist
RUN mkdir -p /app/apps/frontend/public
COPY --from=build /app/apps/frontend/publi[c] ./apps/frontend/public/

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["node", "server.js"]
