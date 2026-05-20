# Risk Platform

Платформа управления ИТ/ИБ-рисками: инциденты, риск-регистр, карта рисков ИТ/ИБ (ISO 27001 + NIST CSF), пользователи и роли (RBAC).

Архитектура — **три изолированных слоя в Docker**:

| Слой | Контейнер | Образ | Где данные |
|------|-----------|-------|------------|
| Фронт | `web` | `nginx:1.27-alpine` + статика | — (stateless) |
| Бэк | `api` | `node:20-alpine` + Fastify | — (stateless) |
| БД | `db` | `postgres:16-alpine` | **named volume `risk-platform-db-data`** |

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  web     │────▶│  api     │────▶│  db          │
│  :80     │     │  :3000   │     │  :5432       │
│ (nginx)  │     │ (Fastify)│     │ (PostgreSQL) │
└────┬─────┘     └────┬─────┘     └──────┬───────┘
     │ bind-mount     │ env_file        │ named volume
     │ config/        │ config/app.env  │ db-data ← переживает обновления
     │ nginx.conf     │                 │
     │ frontend.js    │                 │
```

---

## 1. Разделение данных — обновление не теряет БД

Обеспечивается тем, **где** живёт каждый тип состояния:

| Что | Где хранится | Что происходит при обновлении |
|-----|--------------|-------------------------------|
| **Код фронта** | внутри образа `risk-platform/web` | образ заменяется целиком |
| **Код бэка** | внутри образа `risk-platform/api` | образ заменяется целиком |
| **Данные** (инциденты, риски, карта рисков, пользователи, справочники) | PostgreSQL → **named volume `risk-platform-db-data`** | **не трогается** — volume не привязан к образам |
| **Конфиги** (nginx, параметры приложения, runtime-конфиг фронта) | хостовые файлы в `./config/`, **bind-mount** в контейнеры | правятся на хосте, образ пересобирать не нужно |

Ключевой принцип: **образы — заменяемые, volume и `config/` — постоянные**. `docker compose up -d` с новыми образами api/web никогда не пересоздаёт volume БД.

Схема БД мигрируется автоматически: контейнер `api` при старте выполняет `prisma migrate deploy` — применяются только новые миграции, существующие данные сохраняются.

---

## 2. Обновление в изолированной сети (без git/registry)

Образы переносятся файлом через `docker save` / `docker load`. Git на целевой машине не нужен.

### Первичная установка

**На машине-сборщике (с интернетом):**
```bash
make pack
# → release-YYYYMMDD-HHMM.tar.gz  (внутри: postgres, nginx, api, web образы)
```

Скопировать на целевую машину (флешка / защищённый канал):
- `release-*.tar.gz`
- `docker-compose.yml`
- папку `config/` целиком
- папку `scripts/` и `Makefile`

**На целевой машине (изолированной):**
```bash
cp config/app.env.example config/app.env
# отредактировать config/app.env — пароли БД, JWT_SECRET, INITIAL_ADMIN_PASSWORD

make deploy FILE=release-YYYYMMDD-HHMM.tar.gz
# = docker load < tar  +  docker compose up -d
```

Логин — из `config/app.env` (`INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`). Учётка администратора создаётся при первом старте API.

### Обновление версии (данные сохраняются)

На сборщике: `make pack` → новый `release-*.tar.gz`. Перенести на целевую машину.

```bash
make update FILE=release-NEW.tar.gz
```
Скрипт `update.sh`:
1. `backup.sh` — снимает дамп БД в `backups/` (страховка);
2. `docker load` — загружает новые образы;
3. `docker compose up -d --no-deps api web` — пересоздаёт **только** `api` и `web`. Контейнер `db` и его volume не трогаются.

### Обновление только конфигов (без пересборки)

| Файл | Что меняет | Как применить |
|------|-----------|---------------|
| `config/nginx.conf` | заголовки, кеш, маршруты, проксирование | `docker compose restart web` |
| `config/frontend.js` | `apiBaseUrl`, имя организации, тайм-аут сессии | перезагрузить страницу (`Cache-Control: no-store`) |
| `config/app.env` | пароли, `JWT_SECRET`, порт, уровень логов | `docker compose up -d` (пересоздаёт `api`; БД не тронется) |

> **Справочники** (типы инцидентов, серьёзности, риск-аппетит и т.д.) хранятся **в БД** и редактируются через UI «Справочники» — переживают обновления автоматически, как обычные данные.

### Бэкап / восстановление

```bash
make backup                                       # → backups/risk-platform-<ts>.sql.gz
make restore FILE=backups/risk-platform-<ts>.sql.gz
```

---

## Структура репозитория

```
risk-platform/
├── apps/
│   ├── api/                  Node.js + Fastify + Prisma
│   │   ├── prisma/schema.prisma
│   │   ├── src/{server.js, routes/, lib/, seed/}
│   │   └── Dockerfile
│   └── web/                  React + Vite (SPA)
│       ├── src/
│       └── Dockerfile
├── config/                   bind-mount в контейнеры (НЕ в образах)
│   ├── app.env.example       → скопировать в app.env
│   ├── nginx.conf
│   └── frontend.js
├── scripts/                  build-offline / deploy / update / backup / restore
├── docker-compose.yml
├── Makefile
└── README.md
```

## Локальная разработка (с интернетом)

> Все вызовы `docker compose` идут с `--env-file config/app.env` — иначе compose не подхватит
> `POSTGRES_USER`/`POSTGRES_PASSWORD` для подстановки в `docker-compose.yml`. `make`-команды и
> скрипты в `scripts/` уже делают это автоматически.

```bash
# БД — в Docker, остальное локально
docker compose --env-file config/app.env up -d db

# API
cd apps/api && npm install
export DATABASE_URL="postgresql://risk_platform:risk_platform@localhost:5432/risk_platform"
export INITIAL_ADMIN_PASSWORD="dev12345"
npx prisma migrate dev
npm run dev          # http://localhost:3000

# Фронт
cd apps/web && npm install
npm run dev          # http://localhost:5173
```

## Команды Makefile

```
make help      список команд
make build     сборка образов (нужен интернет)
make pack      релизный tar для офлайн-деплоя
make deploy    первичная установка          (FILE=release-*.tar.gz)
make update    обновление без потери данных (FILE=release-*.tar.gz)
make backup    дамп БД
make restore   восстановление БД            (FILE=backups/*.sql.gz)
make logs      логи всех сервисов
make ps        статус контейнеров
make down      остановить (volume БД сохраняется)
make clean     ⚠️ полное удаление включая БД
```
