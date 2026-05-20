#!/usr/bin/env bash
# Восстанавливает БД из дампа pg_dump.
# Использование:  ./scripts/restore.sh backups/risk-platform-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail

cd "$(dirname "$0")/.."

DUMP="${1:-}"
if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  echo "Доступные бэкапы:" >&2
  ls -lh backups/*.sql.gz 2>/dev/null || echo "  (нет)" >&2
  exit 1
fi

set -a; source config/app.env; set +a

echo "⚠️  Восстановление из ${DUMP} перезапишет ТЕКУЩУЮ БД."
read -p "Продолжить? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || { echo "Отменено"; exit 1; }

DC="docker compose --env-file config/app.env"

echo "==> Остановка api (чтобы не дёргал БД во время restore)"
${DC} stop api

echo "==> psql restore"
gunzip -c "${DUMP}" | ${DC} exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "==> Запуск api"
${DC} start api

echo "✅ Восстановление завершено."
