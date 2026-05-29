# syntax=docker/dockerfile:1

# ─── Stage 1: frontend React (ADR 0053/0054) ──────────────────────────
# Vite compila el SPA del panel. El cache mount de /root/.npm evita
# rebajar deps en cada build; el deps-first COPY maximiza el hit rate.
FROM node:22-alpine AS frontend-builder
WORKDIR /build-fe

COPY manager-src/package.json manager-src/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY manager-src/ ./
RUN npm run build

# ─── Stage 2: backend Go ──────────────────────────────────────────────
# Los cache mounts /go/pkg/mod y /root/.cache/go-build son intencionales
# (ADR 0018) — evitan rebajar deps y recompilar CGO en cada build.
FROM golang:1.25.0-alpine AS build

RUN apk update && apk add --no-cache git build-base libjpeg-turbo-dev libwebp-dev

WORKDIR /build

# Copiar apenas arquivos de dependências primeiro para cachear o download
COPY go.mod go.sum ./

# Copiar whatsmeow-lib que é uma dependência local (submódulo git, obrigatório)
COPY whatsmeow-lib/ ./whatsmeow-lib/

# Download das dependências usando cache persistente do módulo Go.
# O cache mount evita rebaixar todas as deps a cada build.
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copiar o restante do código
COPY . .

ARG VERSION=dev
# Build com cache persistente de módulo e de compilação Go.
# Os mounts /go/pkg/mod e /root/.cache/go-build aceleram drasticamente
# rebuilds incrementais (não recompila CGO/deps inalteradas).
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 go build -ldflags "-X main.version=${VERSION}" -o server ./cmd/webapp-wago

# Servidor MCP (cmd/mcp): stdlib puro, sin CGO. Reusa los MISMOS cache
# mounts para no rebajar deps ni recompilar lo inalterado.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o wago-mcp ./cmd/mcp

# ─── Stage 3: imagen final ────────────────────────────────────────────
FROM alpine:3.19.1 AS final

RUN apk update && apk add --no-cache tzdata ffmpeg libjpeg-turbo libwebp

WORKDIR /app

COPY --from=build /build/server .
COPY --from=build /build/wago-mcp .
# El SPA viene del stage Node, no del filesystem del repo (ADR 0053):
# manager/dist queda como fallback histórico hasta `make manager-build` local.
COPY --from=frontend-builder /build-fe/dist ./manager/dist
COPY --from=build /build/VERSION ./VERSION

ENV TZ=America/Sao_Paulo

# ENTRYPOINT principal: la API. El servidor MCP es un binario aparte en
# la misma imagen; correr con override de entrypoint, p.ej.:
#   docker run --entrypoint /app/wago-mcp -e WAGO_BASE_URL=... -e \
#     WAGO_ADMIN_KEY=... -e MCP_TRANSPORT=http -p 8089:8089 <img>
ENTRYPOINT ["/app/server"]
