FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || npx tsc

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER nodejs
EXPOSE 8008
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8008/ledger || exit 1
CMD ["node", "dist/index.js"]
