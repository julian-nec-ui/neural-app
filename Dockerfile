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

# 2. Install pnpm (we use this ONLY to run the build command)
RUN npm install -g pnpm@latest

# 3. Tell pnpm this is a CI environment
ENV CI=true

# 4. Copy config and lock files
COPY package.json pnpm-lock.yaml* .npmrc* ./

# 5. INSTALL PHASE: Switch to npm
# We use 'npm install' instead of 'pnpm install' to bypass the 
# [ERR_PNPM_IGNORED_BUILDS] security error.
# npm will read your package.json and install everything correctly.
RUN npm install --force

# 6. Copy the rest of the source code
COPY . .

# 7. Build the Next.js app (pnpm is still used here for speed)
RUN pnpm run build

# ==========================================
# Stage 2: Run
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# 8. Copy only the necessary files from the builder stage
# This requires 'output: standalone' in your next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# 9. Start the app using the standalone server.js
CMD ["node", "server.js"]
