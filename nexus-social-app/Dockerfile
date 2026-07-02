# ============================================================
# Dockerfile – Nexus Social App
# Multi-stage production build for Next.js 16 (standalone)
# ============================================================

# ---------- Stage 1: Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Stage 2: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all deps (including dev for build tooling)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build the Next.js standalone app
ENV NEXT_TELEMETRY_DISABLED=1
RUN NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co SUPABASE_SERVICE_ROLE_KEY=placeholder-key NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key npm run build
RUN npx esbuild src/bin/worker.ts --bundle --platform=node --target=node20 --packages=bundle --outfile=.next/standalone/dist/bin/worker.js
RUN npx esbuild src/bin/migration-worker.ts --bundle --platform=node --target=node20 --packages=bundle --outfile=.next/standalone/dist/bin/migration-worker.js

# ---------- Stage 3: Production Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
