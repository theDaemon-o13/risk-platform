# Risk Platform — orchestration
.PHONY: help build pack deploy update backup restore logs ps down clean

# --env-file нужен, чтобы compose читал переменные (${POSTGRES_USER} и т.д.) из config/app.env
DC = docker compose --env-file config/app.env

help: ## Список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Сборка образов api+web (требует интернета)
	$(DC) build

pack: ## Собрать релизный tar для офлайн-деплоя
	bash scripts/build-offline.sh

deploy: ## Первичная установка на изолированной машине: make deploy FILE=release.tar.gz
	@[ -n "$(FILE)" ] || (echo "Usage: make deploy FILE=release-XXX.tar.gz" && exit 1)
	bash scripts/deploy.sh $(FILE)

update: ## Обновить api+web без потери данных: make update FILE=release-new.tar.gz
	@[ -n "$(FILE)" ] || (echo "Usage: make update FILE=release-XXX.tar.gz" && exit 1)
	bash scripts/update.sh $(FILE)

backup: ## Дамп БД в backups/
	bash scripts/backup.sh

restore: ## Восстановить БД: make restore FILE=backups/...sql.gz
	@[ -n "$(FILE)" ] || (echo "Usage: make restore FILE=backups/...sql.gz" && exit 1)
	bash scripts/restore.sh $(FILE)

logs: ## Логи всех сервисов
	$(DC) logs -f --tail=200

ps: ## Статус контейнеров
	$(DC) ps

down: ## Остановить stack (данные БД в volume сохраняются)
	$(DC) down

clean: ## ⚠️ ПОЛНОЕ удаление + volume с БД
	@read -p "Удалить ВСЕ данные включая БД? [y/N] " ans && [ "$$ans" = "y" ] && $(DC) down -v || echo "Отменено"
