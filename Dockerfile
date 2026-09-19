# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Tell pnpm this is a CI environment to avoid TTY/Permission errors
ENV CI=true

# Copy config and lock files
COPY package.json pnpm-lock.yaml* .npmrc ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy the rest of the code
COPY . .

# Build the Next.js app
RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@latest

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "start"]
