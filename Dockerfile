# ============================================
# Stage 1: Build the SPA
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
RUN npm run build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:alpine
LABEL org.opencontainers.image.title="AIScript"
LABEL org.opencontainers.image.description="AI 辅助剧本创作工具"
LABEL org.opencontainers.image.source="https://github.com/dwetdf/AIScript"

# Remove default nginx config and static content
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy built SPA from builder stage
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
