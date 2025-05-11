# Stage 1: Base Bun image (for the runner)
FROM oven/bun:1.1.8 AS base-bun
WORKDIR /usr/src/app

# Stage 2: Base Node.js image (for the builder)
# Use a Long-Term Support (LTS) version of Node.js
# Node.js 18+ has good support for Web Streams APIs globally
FROM node:18-alpine AS base-node
WORKDIR /usr/src/app

# Stage 3: Install all dependencies using Node.js and npm/yarn/pnpm
FROM base-bun AS deps
COPY package.json bun.lockb* package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# If you strictly want to use bun for install even in Node.js builder:
# RUN npm install --global bun
# RUN bun install --frozen-lockfile
# OR, more standardly for a Node.js builder:
RUN bun install --frozen-lockfile

# Stage 4: Build the Next.js application using Node.js
FROM base-node AS builder
ENV NODE_ENV=production
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# If you used bun for install in 'deps' stage:
# RUN npm install --global bun
# RUN bun run build
# OR, more standardly for a Node.js builder:
RUN npm run build

# Stage 5: Production image using Bun
FROM base-bun AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install ONLY production dependencies using Bun
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy the built Next.js app from the 'builder' stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
# package.json is already copied

EXPOSE 3000
USER bun
CMD ["bun", "run", "start"]