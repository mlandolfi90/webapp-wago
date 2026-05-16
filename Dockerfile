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

FROM alpine:3.19.1 AS final

RUN apk update && apk add --no-cache tzdata ffmpeg libjpeg-turbo libwebp

WORKDIR /app

COPY --from=build /build/server .
COPY --from=build /build/manager/dist ./manager/dist
COPY --from=build /build/VERSION ./VERSION

ENV TZ=America/Sao_Paulo

ENTRYPOINT ["/app/server"]
