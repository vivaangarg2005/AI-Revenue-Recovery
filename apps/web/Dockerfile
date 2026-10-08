FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
# Copy workspace package files
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first
RUN npm run build --workspace=@recover-ai/shared

# Build Web frontend
RUN npm run build --workspace=@recover-ai/web

# -------------------------
# Production image (Nginx)
# -------------------------
FROM nginx:alpine

# Copy static assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config if needed (we'll use default for now, but SPA needs fallback)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
