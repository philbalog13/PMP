FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY local-lib ./local-lib
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/local-lib ./local-lib
COPY --from=builder /app/package.json ./
USER nodejs
EXPOSE 8011
EXPOSE 5959
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8011/health || exit 1
CMD ["node", "dist/server.js"]
