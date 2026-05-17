# syntax=docker/dockerfile:1
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

FROM alpine:3.19.1 AS final

RUN apk update && apk add --no-cache tzdata ffmpeg libjpeg-turbo libwebp

WORKDIR /app

COPY --from=build /build/server .
COPY --from=build /build/wago-mcp .
COPY --from=build /build/manager/dist ./manager/dist
COPY --from=build /build/VERSION ./VERSION

ENV TZ=America/Sao_Paulo

# ENTRYPOINT principal: la API. El servidor MCP es un binario aparte en
# la misma imagen; correr con override de entrypoint, p.ej.:
#   docker run --entrypoint /app/wago-mcp -e WAGO_BASE_URL=... -e \
#     WAGO_ADMIN_KEY=... -e MCP_TRANSPORT=http -p 8089:8089 <img>
ENTRYPOINT ["/app/server"]
