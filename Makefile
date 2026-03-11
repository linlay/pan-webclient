APP_NAME := pan-api
GO_CACHE := $(CURDIR)/.cache/go-build
ENV_PUBLIC_PORT := $(shell sed -n 's/^PUBLIC_PORT=//p' .env 2>/dev/null | tail -n 1)
ENV_DEV_WEB_PORT := $(shell sed -n 's/^DEV_WEB_PORT=//p' .env 2>/dev/null | tail -n 1)
PUBLIC_PORT_VALUE := $(or $(PUBLIC_PORT),$(ENV_PUBLIC_PORT),8080)
DEV_WEB_PORT_VALUE := $(or $(DEV_WEB_PORT),$(ENV_DEV_WEB_PORT),11936)

.PHONY: backend-build backend-run backend-test frontend-install frontend-dev frontend-build api-build api-run api-test web-install web-dev web-build apppan-smoke package-mac clean

backend-build:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server

backend-run:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go build -o ../bin/$(APP_NAME) ./cmd/server
	PUBLIC_PORT=$(PUBLIC_PORT_VALUE) DEV_WEB_PORT=$(DEV_WEB_PORT_VALUE) ./bin/$(APP_NAME)

backend-test:
	mkdir -p $(GO_CACHE)
	cd backend && GOCACHE=$(GO_CACHE) go test ./...

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && PUBLIC_PORT=$(PUBLIC_PORT_VALUE) DEV_WEB_PORT=$(DEV_WEB_PORT_VALUE) npm start

frontend-build:
	cd frontend && npm run build

apppan-smoke:
	bash scripts/apppan-smoke.sh

package-mac:
	./scripts/mac/package.sh

clean:
	rm -rf bin frontend/dist data
