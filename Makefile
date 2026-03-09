APP_NAME := pan-api
GO_CACHE := $(CURDIR)/.cache/go-build
ENV_APP_PORT := $(shell sed -n 's/^APP_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_WEB_PORT := $(shell sed -n 's/^WEB_PORT=//p' .env 2>/dev/null | tail -n 1)
APP_PORT_VALUE := $(or $(APP_PORT),$(ENV_APP_PORT),8080)
WEB_PORT_VALUE := $(or $(WEB_PORT),$(ENV_WEB_PORT),5173)

.PHONY: backend-build backend-run backend-test frontend-install frontend-dev frontend-build api-build api-run api-test web-install web-dev web-build clean

backend-build:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server

backend-run:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server
	./bin/$(APP_NAME)

backend-test:
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go test ./...

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && WEB_PORT=$(WEB_PORT_VALUE) VITE_DEV_API_TARGET=http://127.0.0.1:$(APP_PORT_VALUE) npm run dev

frontend-build:
	cd frontend && npm run build

api-build: backend-build

api-run: backend-run

api-test: backend-test

web-install: frontend-install

web-dev: frontend-dev

web-build: frontend-build

clean:
	rm -rf bin frontend/dist data
