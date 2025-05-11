FROM oven/bun:1.1.8 AS base-bun
WORKDIR /usr/src/app

FROM node:18-alpine AS base-node
WORKDIR /usr/src/app

FROM base-bun AS deps
COPY package.json bun.lockb* package-lock.json* yarn.lock* pnpm-lock.yaml* ./

RUN bun install --frozen-lockfile

FROM base-node AS runner
ENV NODE_ENV=production
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN npm run build

RUN chown -R node:node /usr/src/app

EXPOSE 3000
USER node
CMD ["npm", "run", "start"]