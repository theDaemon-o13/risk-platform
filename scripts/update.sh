#!/usr/bin/env bash
# Обновление до новой версии БЕЗ потери данных БД.
# Volume `risk-platform-db-data` не трогается, образы api+web заменяются.
# Использование:  ./scripts/update.sh release-NEW.tar.gz
set -euo pipefail

cd "$(dirname "$0")/.."

TAR="${1:-}"
if [[ -z "${TAR}" || ! -f "${TAR}" ]]; then
  echo "Usage: $0 <release.tar.gz>" >&2
  exit 1
fi

echo "==> Бэкап БД перед обновлением"
./scripts/backup.sh || { echo "Бэкап не удался — обновление прервано"; exit 1; }

DC="docker compose --env-file config/app.env"

echo "==> Загрузка новых образов"
gunzip -c "${TAR}" | docker load

echo "==> Применение обновления (rolling)"
# Перезапускаем только api и web. db не трогаем — данные в volume сохраняются.
${DC} up -d --no-deps api web

echo ""
echo "==> Статус:"
${DC} ps

echo ""
echo "✅ Обновление применено. Данные БД не затронуты."
