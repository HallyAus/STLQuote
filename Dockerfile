# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN pnpm build

# --- Stage 3: Production ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install prisma CLI for migrations (lightweight, no dev deps)
RUN npm install -g prisma@6

# Standalone output already bundles the Prisma client + all deps
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Create uploads directory AFTER all COPY commands so ownership isn't overwritten
RUN mkdir -p /app/uploads/quote-requests /app/uploads/job-photos && \
    chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
