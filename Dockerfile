# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# --- FIX STARTS HERE ---
# Install libc6-compat (Required for Next.js/SWC on Alpine) 
# and build tools for native modules
RUN apk add --no-cache libc6-compat python3 make g++
# --- FIX ENDS HERE ---

# Install pnpm
RUN npm install -g pnpm@latest

# Tell pnpm this is a CI environment
ENV CI=true

# Copy config and lock files
COPY package.json pnpm-lock.yaml* .npmrc ./

# Install dependencies
# Note: we use --frozen-lockfile in CI usually, but I kept your flag
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy the rest of the code
COPY . .

# Build the Next.js app
RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app

# We still need libc6-compat in the final image for the app to run
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@latest

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "start"]
