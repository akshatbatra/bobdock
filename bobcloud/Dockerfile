# Stage 1: Builder (temporary workspace)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Production (final image)
FROM node:22-alpine

# System dependencies for Bob Shell
RUN apk add --no-cache git curl bash

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Bob Shell PATH configuration
ENV PATH="/home/nodejs/.bob/bin:/root/.bob/bin:$PATH"

WORKDIR /app

# Copy only node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Install Bob Shell as root (required)
RUN chmod +x scripts/install-bob-docker.sh && \
    bash scripts/install-bob-docker.sh

# Copy Bob Shell config (license consent + auth settings + MCP)
RUN mkdir -p /home/nodejs/.bob/settings /home/nodejs/.bob/tmp /app/.bob/tmp
COPY --chown=nodejs:nodejs settings.json /home/nodejs/.bob/settings.json
COPY --chown=nodejs:nodejs mcp_settings.json /home/nodejs/.bob/settings/mcp_settings.json
RUN chown -R nodejs:nodejs /home/nodejs/.bob /app/.bob

# Switch to non-root user
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
