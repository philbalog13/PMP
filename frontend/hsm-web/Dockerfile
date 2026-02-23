# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app/hsm-web

# Copy package files
COPY hsm-web/package.json ./

# Install dependencies
RUN npm install

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app/hsm-web

# Build arguments for Next.js public env vars (needed at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL

# Copy dependencies from deps stage
COPY --from=deps /app/hsm-web/node_modules ./node_modules

# Copy shared directory and install its dependencies
COPY shared ../shared
RUN cd ../shared && npm install

# Copy application code
COPY hsm-web .

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
COPY --from=builder /app/hsm-web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/hsm-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/hsm-web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "server.js"]
