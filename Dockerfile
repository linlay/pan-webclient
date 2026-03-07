FROM node:22-alpine AS web-build
WORKDIR /workspace/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install
COPY apps/web ./
COPY packages /workspace/packages
RUN npm run build

FROM golang:1.26-alpine AS api-build
WORKDIR /workspace/apps/api
RUN apk add --no-cache sqlite
COPY apps/api/go.mod ./
COPY apps/api ./
RUN go build -o /out/pan-api ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache sqlite
WORKDIR /app
COPY --from=api-build /out/pan-api /app/pan-api
COPY --from=web-build /workspace/apps/web/dist /app/web
ENV PAN_STATIC_DIR=/app/web
EXPOSE 8080
CMD ["/app/pan-api"]
