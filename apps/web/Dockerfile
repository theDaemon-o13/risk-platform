# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# nginx-конфиг и runtime-конфиг фронта подтянутся через bind-mount из ./config
# Здесь только статика
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
