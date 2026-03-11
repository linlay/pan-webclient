FROM golang:1.26-alpine AS dev
RUN apk add --no-cache apache2-utils
WORKDIR /workspace/backend
ENV PATH="/usr/local/go/bin:${PATH}"

FROM golang:1.26-alpine AS build
RUN apk add --no-cache apache2-utils
WORKDIR /workspace/backend
ENV PATH="/usr/local/go/bin:${PATH}"
COPY backend/go.mod ./
COPY backend ./
RUN go build -o /out/pan-api ./cmd/server

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache apache2-utils \
    && mkdir -p /app/configs/mounts /app/data
COPY --from=build /out/pan-api /app/pan-api
ENV API_PORT=8080
EXPOSE 8080
CMD ["/app/pan-api"]
