# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 (an optional peer pulled in by prisma/better-auth) has no
# prebuilt binary for Node 20, so npm compiles it. The toolchain is installed
# as a virtual apk package and removed right after, leaving only the built
# artifact in node_modules.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci \
  && apk del .build-deps \
  && npm cache clean --force

FROM node:20-alpine AS build
WORKDIR /app
# Prisma config reads this at generate time; it never connects during generate.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# One-shot migration runner. Mirrors the migrator pattern used by the existing
# production stack: exits 0 when migrations are applied, and the app waits for it.
FROM node:20-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && apk del .build-deps \
  && npm cache clean --force
COPY prisma ./prisma
COPY prisma7.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy", "--config", "prisma7.config.ts"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && apk del .build-deps \
  && npm cache clean --force
COPY prisma ./prisma
COPY prisma7.config.ts ./
COPY --from=build /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "dist/src/main.js"]
