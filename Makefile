include .envrc

# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
.PHONY: help
help:
	@echo -e "\e[1mUsage:\e[0m"
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

confirm:
	@echo -ne "\e[1mAre you sure? [y/N]: \e[0m" && read ans && [ $${ans:-N} = y ]

# ==================================================================================== #
# BUILD
# ==================================================================================== #

## build/api: build the cmd/api application
.PHONY: build/api
build/api:
	@echo -e "\e[33m=> Building Backend...\e[0m"
	@go build -o=./bin/api ./cmd/api
	@echo -e "\e[32m✔ Build completed.\e[0m"

.PHONY: build/frontend
build/frontend: services/nginx
	@echo -e "\e[33m=> Building Backend...\e[0m"
	@npm run build --prefix ./frontend
	@sudo cp -r ./frontend/dist/* /usr/share/nginx/html
	@echo -e "\e[32m✔ Build completed.\e[0m"



# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## run/frontend/develop: run the frontend development
.PHONY: run/frontend
run/frontend:
	@echo -e "\e[33m=> Running Frontend...\e[0m"
	@npm run dev --prefix ./frontend

## run/frontend/prod: run the frontend production
run/app: build/frontend run/api
	@echo -e "\e[33m=> Running Frontend...\e[0m"

## run/api: run the backend
.PHONY: run/api
run/api: build/api
	@echo -e "\e[33m=> Running Backend...\e[0m"
	@./bin/api -db-dsn=${BUGBEE_DB_DSN} -smtp-username=${SMTP_USERNAME} -smtp-password=${SMTP_PASSWORD} -clients=${CLIENTS} -encryption-key=${ENCRYPTION_KEY} -smtp-sender=${SMTP_SENDER} -client-host=${CLIENT_HOST} -host=${SERVER_HOST} -client-port=${CLIENT_PORT} -client-protocol=${CLIENT_PROTOCOL} -redis-address=${REDIS_ADDRESS} -supabase-url=${SUPABASE_URL} -supabase-api-key=${SUPABASE_API_KEY} -nsfw-base-url=${NSFW_BASE_URL}

.PHONY: run/vc
run/vc:
	@echo -e "\e[33m=> Running Video Chat...\e[0m"
	@npm start --prefix ./mirotalksfu

.PHONY: run/chat
run/chat:
	@echo -e "\e[33m=> Running Messaging...\e[0m"
	@npm start --prefix ./chat

.PHONY: run/nsfw-detector
run/nsfw-detector:
	@echo -e "\e[33m=> Running NSFW Detector...\e[0m"
	@fastapi/.venv/bin/uvicorn --app-dir ./fastapi/ app:app --host 0.0.0.0 --port 8001

# ==================================================================================== #
# SERVICES
# ==================================================================================== #

## services/up: start all services required by application
.PHONY: services/up
services/up:
	@if ! systemctl is-active --quiet postgresql.service; then \
		echo -e "\e[33mStarting Postgres...\e[0m"; \
		systemctl start postgresql.service; \
		echo -e "\e[32m✔ Postgres started.\e[0m"; \
	fi

	@if ! systemctl is-active --quiet redis.service; then \
		echo -e "\e[33mStarting Redis...\e[0m"; \
		systemctl start redis.service; \
		echo -e "\e[32m✔ Redis started.\e[0m"; \
	fi

.PHONY: services/nginx
services/nginx:
	@if ! pgrep nginx > /dev/null; then \
		echo -e "\e[31mStarting Nginx...\e[0m"; \
		sudo nginx -c /home/rickin/CeleBrity/Programming/Go/Projects/BugBee/nginx/nginx.conf -p /home/rickin/CeleBrity/Programming/Go/Projects/BugBee/nginx/; \
		echo -e "\e[32m✔ Nginx started.\e[0m"; \
	fi

## services/down: stop all services required by application
.PHONY: services/down
services/down:
	@if systemctl is-active --quiet postgresql.service; then \
		echo -e "\e[31mStopping Postgres...\e[0m"; \
		systemctl stop postgresql.service; \
		echo -e "\e[32m✔ Postgres stopped.\e[0m"; \
	else \
		echo -e "\e[33mPostgres is already stopped.\e[0m"; \
	fi

	@if systemctl is-active --quiet redis.service; then \
		echo -e "\e[31mStopping Redis...\e[0m"; \
		systemctl stop redis.service; \
		echo -e "\e[32m✔ Redis stopped.\e[0m"; \
	else \
		echo -e "\e[33mRedis is already stopped.\e[0m"; \
	fi

	@if systemctl is-active --quiet nginx.service; then \
		echo -e "\e[31mStopping Nginx...\e[0m"; \
		systemctl stop nginx.service; \
		echo -e "\e[32m✔ Nginx stopped.\e[0m"; \
	else \
		echo -e "\e[33mNginx is already stopped.\e[0m"; \
	fi

# ==================================================================================== #
# DATABASE
# ==================================================================================== #

## db/psql: connect to the database using psql
.PHONY: db/psql
db/psql:
	@echo -e "\e[33mConnecting to database...\e[0m"
	@psql ${BUGBEE_DB_DSN}

## db/migration/new name=$1: create a new database migration
.PHONY: db/migration/new
db/migration/new:
	@echo -e "\e[33mCreating migration files for \e[1m${name}\e[0m..."
	@migrate create -seq -ext=.sql -dir=./migrations ${name}
	@echo -e "\e[32m✔ Migration files created.\e[0m"

## db/migration/up: apply all up database migrations
.PHONY: db/migration/up
db/migration/up: confirm
	@echo -e "\e[33mRunning up migrations...\e[0m"
	@migrate -path ./migrations -database ${BUGBEE_DB_DSN} up
	@echo -e "\e[32m✔ Migrations applied.\e[0m"

## db/migration/down: apply all down database migrations
.PHONY: db/migration/down
db/migration/down:
	@echo -e "\e[33mRolling back all migrations...\e[0m"
	@migrate -path ./migrations -database ${BUGBEE_DB_DSN} down
	@echo -e "\e[32m✔ Migrations rolled back.\e[0m"
