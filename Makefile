APP_NAME := pan-api
GO_CACHE := $(CURDIR)/.cache/go-build
COMPOSE_MOUNTS_FILE := .cache/docker-compose.mounts.yml
COMPOSE_FILES := -f docker-compose.yml -f $(COMPOSE_MOUNTS_FILE)
ENV_NGINX_PORT := $(shell sed -n 's/^NGINX_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_API_PORT := $(shell sed -n 's/^API_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_WEB_PORT := $(shell sed -n 's/^WEB_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_PUBLIC_PORT := $(shell sed -n 's/^PUBLIC_PORT=//p' .env 2>/dev/null | tail -n 1)
NGINX_PORT_VALUE := $(or $(NGINX_PORT),$(ENV_NGINX_PORT),$(ENV_WEB_PORT),$(ENV_PUBLIC_PORT),11946)
API_PORT_VALUE := $(or $(API_PORT),$(ENV_API_PORT),8080)

.PHONY: backend-build backend-test frontend-install frontend-build frontend-test compose-mounts dev-up dev-logs dev-down prod-sim-up prod-sim-logs prod-sim-down apppan-smoke clean

backend-build:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server

backend-test:
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go test ./...

frontend-install:
	cd frontend && npm install

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && node --test src/api/routing.test.ts

compose-mounts:
	mkdir -p .cache
	cd backend && GOCACHE=$(GO_CACHE) go run ./cmd/composemounts -output ../$(COMPOSE_MOUNTS_FILE)

dev-up: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile dev up -d --build

dev-logs: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile dev logs -f nginx api frontend-dev

dev-down: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile dev down --remove-orphans

prod-sim-up: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile prod-sim up -d --build

prod-sim-logs: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile prod-sim logs -f frontend-prod api

prod-sim-down: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) --profile prod-sim down --remove-orphans

apppan-smoke:
	bash scripts/apppan-smoke.sh

clean:
	rm -rf bin frontend/dist data
