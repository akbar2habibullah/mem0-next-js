# Stage 1: Base Node.js image (for builder AND runner)
# Use a Long-Term Support (LTS) version of Node.js, alpine for smaller size
FROM node:18-alpine AS base-node
WORKDIR /usr/src/app

# Stage 2: Install all dependencies using Node.js and npm
FROM base-node AS deps
# Copy only package.json and lock files first for better caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Use npm ci for reproducible installs from lock file
# If you use yarn: yarn install --frozen-lockfile
# If you use pnpm: pnpm install --frozen-lockfile
# Assuming npm for this example:
RUN npm ci

# Stage 3: Build the Next.js application using Node.js
FROM base-node AS builder
ENV NODE_ENV=production
# Copy dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy the rest of the application source code
COPY . .
# Run the build script (e.g., next build)
# Ensure your package.json has "build": "next build"
RUN npm run build

# Stage 4: Production image using Node.js
FROM base-node AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package.json and lock file to install only production dependencies
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Install ONLY production dependencies.
# --omit=dev is the npm v7+ equivalent of --production for npm install
# For older npm: npm install --production
# If you use yarn: yarn install --production --frozen-lockfile
# If you use pnpm: pnpm install --prod --frozen-lockfile
# Assuming npm for this example:
RUN npm ci --omit=dev

# Copy the built Next.js app from the 'builder' stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public # If you have a public folder
# Optional: Copy next.config.js if it exists and is needed at runtime
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY --from=builder /usr/src/app/package.json ./package.json

# Expose the port Next.js runs on
EXPOSE 3000

# The node:alpine image might already set a non-root user.
# If not, or you want to be explicit:
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser
# For many Node.js base images, the 'node' user is already available.
USER node

# Command to run the Next.js app
# Ensure your package.json has a "start": "next start" script
CMD ["npm", "run", "start"]