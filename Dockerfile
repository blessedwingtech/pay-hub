# syntax=docker/dockerfile:1

# ========================================================
# Stage 1: Base image
# ========================================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ========================================================
# Stage 2: Dependencies
# ========================================================
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ========================================================
# Stage 3: Builder
# ========================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables needed during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma Client and build standalone Next.js
RUN npx prisma generate
RUN npm run build

# ========================================================
# Stage 4: Runner (Production)
# ========================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets and standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Start Next.js standalone server
CMD ["node", "server.js"]
