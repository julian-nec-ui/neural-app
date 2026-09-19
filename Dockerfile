# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Install system dependencies 
# libc6-compat is required for Next.js/SWC on Alpine
# python3, make, g++ are required for native npm modules (like sharp, bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++

# 2. Install pnpm
RUN npm install -g pnpm@latest

# 3. Tell pnpm this is a CI environment
ENV CI=true

# 4. Copy config and lock files first (to optimize Docker caching)
COPY package.json pnpm-lock.yaml* .npmrc ./

# 5. Install dependencies
# REMOVED: --ignore-scripts (it was causing failures with binary packages)
# ADDED: --force (to bypass peer dependency conflicts)
RUN pnpm install --no-frozen-lockfile --force

# 6. Copy the rest of the source code
COPY . .

# 7. Build the Next.js app
RUN pnpm run build

# ==========================================
# Stage 2: Run
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install libc6-compat in the runner stage as well
RUN apk add --no-cache libc6-compat

# Set environment to production
ENV NODE_ENV=production

# 8. Copy only the necessary files from the builder stage
# This uses the 'standalone' output from your next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# 9. Start the app using the standalone server.js (not pnpm start)
CMD ["node", "server.js"]
