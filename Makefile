include .envrc

# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
.PHONY: help
help:
	@echo 'Usage:'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

confirm:
	@echo -n 'Are you sure?[y/N] ' && read ans && [ $${ans:-N} = y ]

# ==================================================================================== #
# BUILD
# ==================================================================================== #

## build/api: build the cmd/api application
.PHONY: build/api
build/api:
	@echo "Building cmd/api..."
	@go build -o=./bin/api ./cmd/api

# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## run/api: run the cmd/api application
.PHONY: run/api
run/api: build/api
	@./bin/api -db-dsn=${BUGBEE_DB_DSN} -smtp-username=${SMTP_USERNAME} -smtp-password=${SMTP_PASSWORD} -encryption-key=${ENCRYPTION_KEY} -smtp-sender=${SMTP_SENDER}

## db/psql: connect to the database using psql
.PHONY: db/psql
db/psql:
	psql ${BUGBEE_DB_DSN}

## db/migration/new name=$1: create a new database migration
.PHONY: db/migration/new
db/migration/new:
	@echo 'Creating migration files for ${name}'
	migrate create -seq -ext=.sql -dir=./migrations ${name}

## db/migration/up: apply all up database migrations
.PHONY: db/migration/up
db/migration/up: confirm
	@echo 'Running up migrations...'
	@migrate -path ./migrations -database ${BUGBEE_DB_DSN} up

## db/migration/down: apply all down database migrations
.PHONY: db/migration/down
db/migration/down:
	@migrate -path ./migrations -database ${BUGBEE_DB_DSN} down