APP_NAME := pan-api
GO_CACHE := $(CURDIR)/.cache/go-build
COMPOSE_MOUNTS_FILE := .cache/docker-compose.mounts.yml
COMPOSE_FILES := -f docker-compose.yml -f $(COMPOSE_MOUNTS_FILE)
DEV_COMPOSE_FILES := -f docker-compose.yml -f docker-compose.dev.yml -f $(COMPOSE_MOUNTS_FILE)
ENV_NGINX_PORT := $(shell sed -n 's/^NGINX_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_API_PORT := $(shell sed -n 's/^API_PORT=//p' .env 2>/dev/null | tail -n 1)
NGINX_PORT_VALUE := $(or $(NGINX_PORT),$(ENV_NGINX_PORT),11946)
API_PORT_VALUE := $(or $(API_PORT),$(ENV_API_PORT),8080)
VERSION := $(shell cat VERSION 2>/dev/null || echo "dev")
ARCH := $(shell uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/')

.PHONY: build build-backend build-frontend compose-mounts run stop docker-up docker-down release apppan-smoke clean

build: build-backend build-frontend

build-backend:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server

build-frontend:
	if [ ! -d frontend/node_modules ]; then cd frontend && npm ci; fi
	cd frontend && npm run build

compose-mounts:
	mkdir -p .cache
	cd backend && GOCACHE=$(GO_CACHE) go run ./cmd/composemounts -output ../$(COMPOSE_MOUNTS_FILE)

run: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(DEV_COMPOSE_FILES) up -d --build api frontend-dev nginx

stop: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(DEV_COMPOSE_FILES) down --remove-orphans

docker-up: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) up -d --build

docker-down: compose-mounts
	NGINX_PORT=$(NGINX_PORT_VALUE) API_PORT=$(API_PORT_VALUE) docker compose $(COMPOSE_FILES) down --remove-orphans

release:
	VERSION=$(VERSION) ARCH=$(ARCH) bash scripts/release.sh

apppan-smoke:
	bash scripts/apppan-smoke.sh

clean:
	rm -rf bin frontend/dist data
