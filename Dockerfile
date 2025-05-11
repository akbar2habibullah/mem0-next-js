# Stage 1: Base image with Bun
# Pin to a specific version for reproducible builds
FROM oven/bun:1.1.8 AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Stage 2: Install all dependencies (including devDependencies for building)
FROM base AS deps
COPY package.json bun.lockb ./
# Install ALL dependencies needed for the build process
RUN bun install --frozen-lockfile

# Stage 3: Build the Next.js application
FROM base AS builder
# Copy dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy the rest of the application source code
COPY . .
# Run the build script (e.g., next build)
RUN bun run build

# Stage 4: Production image
# Use the same base or a slim version if available and suitable
FROM base AS runner
WORKDIR /usr/src/app

# Install ONLY production dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy the built Next.js app from the 'builder' stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public # If you have a public folder
COPY --from=builder /usr/src/app/next.config.js ./next.config.js # If you have one
# package.json is already copied for bun install, but ensure it's there for `bun run start`
# COPY --from=builder /usr/src/app/package.json ./package.json

# Expose the port Next.js runs on
EXPOSE 3000

# Set the user to 'bun' (good practice)
USER bun

# Command to run the Next.js app
# Ensure your package.json has a "start": "next start" script
CMD ["bun", "run", "start"]