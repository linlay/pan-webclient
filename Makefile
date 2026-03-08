APP_NAME := pan-api
GO_CACHE := /Users/linlay-macmini/Project/pan-webclient/.cache/go-build

.PHONY: api-build api-run api-test web-install web-dev web-build clean

api-build:
	mkdir -p bin
	mkdir -p $(GO_CACHE)
	cd apps/api && GOCACHE=$(GO_CACHE) go build -o ../../bin/$(APP_NAME) ./cmd/server

api-run:
	mkdir -p $(GO_CACHE)
	cd apps/api && GOCACHE=$(GO_CACHE) go build -o ../../bin/$(APP_NAME) ./cmd/server
	set -a; [ ! -f ./.env ] || . ./.env; set +a; ./bin/$(APP_NAME)

api-test:
	mkdir -p $(GO_CACHE)
	cd apps/api && GOCACHE=$(GO_CACHE) go test ./...

web-install:
	cd apps/web && npm install

web-dev:
	cd apps/web && npm run dev

web-build:
	cd apps/web && npm run build

clean:
	rm -rf bin apps/web/dist data
