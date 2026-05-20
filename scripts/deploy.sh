#!/usr/bin/env bash
# Первичная установка на изолированной машине.
# Использование:  ./scripts/deploy.sh release-YYYYMMDD-HHMM.tar.gz
set -euo pipefail

cd "$(dirname "$0")/.."

TAR="${1:-}"
if [[ -z "${TAR}" || ! -f "${TAR}" ]]; then
  echo "Usage: $0 <release.tar.gz>" >&2
  exit 1
fi

if [[ ! -f config/app.env ]]; then
  echo "❌ Не найден config/app.env. Скопируйте config/app.env.example → config/app.env и заполните пароли." >&2
  exit 1
fi

DC="docker compose --env-file config/app.env"

echo "==> Загрузка образов из ${TAR}"
gunzip -c "${TAR}" | docker load

echo "==> Запуск stack"
${DC} up -d

echo ""
echo "==> Проверка статуса:"
sleep 3
${DC} ps

echo ""
echo "✅ Готово."
echo "Web:  http://localhost:${WEB_PORT:-80}/"
echo "API:  http://localhost:${WEB_PORT:-80}/api/health"
echo ""
echo "Первичный логин — из config/app.env (INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD)."
