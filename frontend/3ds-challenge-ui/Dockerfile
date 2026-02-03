# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/3ds-challenge-ui
COPY 3ds-challenge-ui/package*.json ./
RUN npm ci

COPY 3ds-challenge-ui/ ./
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/3ds-challenge-ui/dist /usr/share/nginx/html
COPY 3ds-challenge-ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3088

HEALTHCHECK --interval=30s --timeout=3s CMD nc -z 127.0.0.1 3088 || exit 1

CMD ["nginx", "-g", "daemon off;"]
