FROM node:22-alpine AS web-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend ./
COPY packages /workspace/packages
RUN npm run build

FROM golang:1.26-alpine AS api-build
WORKDIR /workspace/backend
COPY backend/go.mod ./
COPY backend ./
RUN go build -o /out/pan-api ./cmd/server

FROM alpine:3.21
WORKDIR /app
COPY --from=api-build /out/pan-api /app/pan-api
COPY --from=web-build /workspace/frontend/dist /app/web
ENV PAN_STATIC_DIR=/app/web
EXPOSE 8080
CMD ["/app/pan-api"]
