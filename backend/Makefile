include .env

DB_URL=postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(POSTGRES_DB)?sslmode=disable

migrate-up:
	goose -dir ./sql/schema postgres "$(DB_URL)" up

migrate-down:
	goose -dir ./sql/schema postgres "$(DB_URL)" down

migrate-status:
	goose -dir ./sql/schema postgres "$(DB_URL)" status

migrate-create:
	goose -dir ./sql/schema create $(name) sql

sqlc-gen:
	rm -f ./internal/database/*sql.go
	sqlc generate

dev:
	@trap 'kill 0' SIGINT; \
	(cd backend && air) & \
	(cd frontend && bun run dev) & \
	wait

