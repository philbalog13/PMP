# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app/monitoring-dashboard

# Copy package files
COPY monitoring-dashboard/package.json ./

# Install dependencies
RUN npm install

# Copy shared directory to parent
COPY shared ../shared

# Copy source code
COPY monitoring-dashboard ./

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/monitoring-dashboard/dist /usr/share/nginx/html

# Create nginx config
RUN echo 'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
