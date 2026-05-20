# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# OpenSSL для Prisma на alpine
RUN apk add --no-cache openssl

# Зависимости (только production)
COPY --from=deps /app/node_modules ./node_modules
# Сгенерированный Prisma client поверх (из build-этапа)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

COPY package.json ./
COPY prisma ./prisma
COPY src ./src

EXPOSE 3000

# Entry: миграции БД → запуск сервера. Если PG ещё не готов — ретрай.
CMD ["sh", "-c", "until npx prisma migrate deploy; do echo 'Waiting for DB...'; sleep 2; done && node src/server.js"]
