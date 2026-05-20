#!/usr/bin/env bash
# Делает дамп БД через pg_dump в backups/.
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
OUT="backups/risk-platform-${TS}.sql.gz"

# Читаем имя БД и юзера из app.env
set -a; source config/app.env; set +a

echo "==> pg_dump → ${OUT}"
docker compose --env-file config/app.env exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists \
  | gzip > "${OUT}"

SIZE=$(du -h "${OUT}" | awk '{print $1}')
echo "✅ Бэкап: ${OUT} (${SIZE})"

# Чистим бэкапы старше 30 дней
find backups -name '*.sql.gz' -mtime +30 -delete 2>/dev/null || true
