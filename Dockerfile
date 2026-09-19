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

# 2. Install pnpm
RUN npm install -g pnpm@latest

# 3. Tell pnpm this is a CI environment
ENV CI=true

# 4. Copy config and lock files
COPY package.json pnpm-lock.yaml* .npmrc* ./

# --- THE FINAL FIX STARTS HERE ---
# We manually create/append to the .npmrc file.
# This tells pnpm: "I trust unrs-resolver to run its build scripts."
# This is the only place pnpm 9+ reads this setting now.
RUN echo "only-built-dependencies[]=unrs-resolver" >> .npmrc
# --- THE FINAL FIX ENDS HERE ---

# 5. Install dependencies
RUN pnpm install --no-frozen-lockfile --force

# 6. Copy the rest of the source code
COPY . .

# 7. Build the Next.js app
RUN pnpm run build

# ==========================================
# Stage 2: Run
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# 8. Copy only the necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# 9. Start the app using the standalone server.js
CMD ["node", "server.js"]
