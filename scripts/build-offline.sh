#!/usr/bin/env bash
# Собирает три образа (db pulled, api, web) и упаковывает их в один tar для офлайн-деплоя.
# Запускать на машине с интернетом.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(date +%Y%m%d-%H%M)}"
OUT="release-${VERSION}.tar.gz"

echo "==> [1/4] Pull PostgreSQL & nginx baseline images"
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull node:20-alpine

echo "==> [2/4] Build api & web"
docker compose --env-file config/app.env build api web

echo "==> [3/4] Tag images with version"
docker tag risk-platform/api:latest "risk-platform/api:${VERSION}"
docker tag risk-platform/web:latest "risk-platform/web:${VERSION}"

echo "==> [4/4] Save images to ${OUT}"
docker save \
  postgres:16-alpine \
  nginx:1.27-alpine \
  "risk-platform/api:latest" \
  "risk-platform/api:${VERSION}" \
  "risk-platform/web:latest" \
  "risk-platform/web:${VERSION}" \
  | gzip -1 > "${OUT}"

SIZE=$(du -h "${OUT}" | awk '{print $1}')
echo ""
echo "==> Готово: ${OUT} (${SIZE})"
echo ""
echo "Передайте на целевую машину три файла:"
echo "  - ${OUT}"
echo "  - docker-compose.yml"
echo "  - config/  (вся папка с app.env, nginx.conf, frontend.js)"
echo ""
echo "На целевой машине:  ./scripts/deploy.sh ${OUT}"
