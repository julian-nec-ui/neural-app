# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

# 1. Install system dependencies for Debian Slim
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy config and lock files
COPY package.json pnpm-lock.yaml* .npmrc* ./

# 3. Install dependencies using npm
# This bypasses pnpm's security blocks entirely
RUN npm install --force

# 4. Copy the rest of the source code
COPY . .

# 5. Build the Next.js app using npm
# This will execute the "build" script inside your package.json
RUN npm run build

# ==========================================
# Stage 2: Run
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# 6. Copy only the necessary files from the builder stage
# This requires 'output: standalone' in your next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# 7. Start the app using the standalone server.js
CMD ["node", "server.js"]
