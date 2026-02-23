# ==============================================
# Dockerfile - Sim-Network-Switch
# Optimized multi-stage build
# ==============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (layer caching)
COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8004
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8004
EXPOSE 8583

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8004/health/live || exit 1

# Switch to non-root user
USER nodejs

# Start application
CMD ["node", "dist/index.js"]
