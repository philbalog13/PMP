# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app/portal

# Copy package files
COPY portal/package.json ./

# Install dependencies
RUN npm install

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app/portal

# Build arguments for Next.js env vars (needed at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG INTERNAL_API_URL=http://api-gateway:8000
ARG INTERNAL_LAB_PROXY_URL=http://lab-access-proxy:8099
ARG NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
ARG NEXT_PUBLIC_TPE_URL=http://localhost:3001
ARG NEXT_PUBLIC_USER_CARDS_URL=http://localhost:3004
ARG NEXT_PUBLIC_HSM_URL=http://localhost:3006
ARG NEXT_PUBLIC_MONITORING_URL=http://localhost:3082
ARG NEXT_PUBLIC_CTF_ATTACKBOX_URL=http://localhost:7681
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV INTERNAL_LAB_PROXY_URL=$INTERNAL_LAB_PROXY_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL
ENV NEXT_PUBLIC_TPE_URL=$NEXT_PUBLIC_TPE_URL
ENV NEXT_PUBLIC_USER_CARDS_URL=$NEXT_PUBLIC_USER_CARDS_URL
ENV NEXT_PUBLIC_HSM_URL=$NEXT_PUBLIC_HSM_URL
ENV NEXT_PUBLIC_MONITORING_URL=$NEXT_PUBLIC_MONITORING_URL
ENV NEXT_PUBLIC_CTF_ATTACKBOX_URL=$NEXT_PUBLIC_CTF_ATTACKBOX_URL

# Copy dependencies from deps stage
COPY --from=deps /app/portal/node_modules ./node_modules

# Copy shared directory and install its dependencies
COPY shared ../shared
RUN cd ../shared && npm install

# Copy application code
COPY portal .

# Set environment to production for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/portal/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/portal/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "server.js"]
