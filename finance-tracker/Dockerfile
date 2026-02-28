# ── Stage 1: Build the Vite client ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY client/ ./client/
COPY server/ ./server/

# Build the Vite client → outputs to client/dist
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built client assets from the builder stage
COPY --from=builder /app/client/dist ./client/dist

# Copy server source
COPY server/ ./server/

# SQLite database will be stored on a named volume mounted at /data
# DB_PATH points there so data persists across container restarts
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/finance.db

# Expose the Express server port
EXPOSE 3001

# Create the data directory (volume mount point)
RUN mkdir -p /data

CMD ["node", "server/server.js"]
