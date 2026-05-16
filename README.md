<h1 align="center">WebAPP-Wago</h1>

<div align="center">

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go)](https://golang.org/)

</div>

## About

**WebAPP-Wago** is a high-performance WhatsApp REST API service built in Go. It uses the [whatsmeow](https://github.com/tulir/whatsmeow) library to communicate directly with WhatsApp's WebSocket servers (no Puppeteer, no Android emulator), making it fast and lightweight.

This project is a derivative work based on [Evolution Go](https://github.com/EvolutionAPI/evolution-go) (Apache License 2.0). See [NOTICE](./NOTICE) for attribution and the list of significant modifications.

## Features

- **High performance** — Built with Go for minimal CPU/RAM footprint
- **REST API** — Clean endpoints, Swagger-documented
- **Real-time events** — WebSocket, Webhooks, AMQP/RabbitMQ, and NATS support
- **Media handling** — Images, videos, audio, documents; MinIO/S3 storage
- **Optional persistence** — PostgreSQL for message history
- **QR code pairing** — Built-in pairing flow
- **Docker ready** — Compose configs included

## Quick Start

### Docker

```bash
git clone --recurse-submodules https://github.com/mlandolfi90/webapp-wago.git
cd webapp-wago
cp .env.example .env
make docker-build
make docker-run
```

> The `whatsmeow-lib` dependency is a git submodule. The `--recurse-submodules`
> flag is required, otherwise the build fails. If you already cloned without it,
> run `git submodule update --init --recursive`.

### Local development

```bash
git clone --recurse-submodules https://github.com/mlandolfi90/webapp-wago.git
cd webapp-wago

make setup
cp .env.example .env
make dev
```

Run `make help` for all available commands. See [COMMANDS.md](./COMMANDS.md) for detailed workflows.

## Configuration

Create a `.env` file from the template:

```env
SERVER_PORT=8080
CLIENT_NAME=webapp-wago

GLOBAL_API_KEY=your-secure-api-key-here

POSTGRES_AUTH_DB=postgresql://postgres:password@localhost:5432/webappwago_auth?sslmode=disable
POSTGRES_USERS_DB=postgresql://postgres:password@localhost:5432/webappwago_users?sslmode=disable
DATABASE_SAVE_MESSAGES=false

WADEBUG=DEBUG
LOGTYPE=console

# Optional
# AMQP_URL=amqp://guest:guest@localhost:5672/
# NATS_URL=nats://localhost:4222
# WEBHOOK_URL=https://your-webhook-url.com/webhook
# MINIO_ENABLED=true
# MINIO_ENDPOINT=localhost:9000
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin
```

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | HTTP port | `8080` |
| `CLIENT_NAME` | Client identifier | `webapp-wago` |
| `GLOBAL_API_KEY` | API authentication key | **Required** |
| `DATABASE_SAVE_MESSAGES` | Enable message persistence | `false` |
| `WADEBUG` | WhatsApp protocol log level | `INFO` |

## API Documentation

Once the server is running, Swagger UI is available at:

```
http://localhost:8080/swagger/index.html
```

### Key endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/instance/create` | Create a WhatsApp instance |
| `GET`  | `/instance/{name}/qrcode` | Get QR code for pairing |
| `POST` | `/message/sendText` | Send text message |
| `POST` | `/message/sendMedia` | Send media message |
| `GET`  | `/instance/{name}/status` | Get instance status |
| `DELETE` | `/instance/{name}` | Delete instance |

## Project Structure

```
webapp-wago/
├── cmd/webapp-wago/      # Application entry point
├── pkg/
│   ├── core/             # Core services & middleware
│   ├── instance/         # Instance management
│   ├── message/          # Message handling
│   ├── sendMessage/      # Message sending
│   ├── routes/           # HTTP routes
│   ├── middleware/       # Auth & validation
│   ├── config/           # Configuration
│   ├── events/           # Event producers (AMQP, NATS, Webhook, WS)
│   └── storage/          # Media storage (MinIO/S3)
├── whatsmeow-lib/        # WhatsApp protocol library
├── docs/                 # Swagger/OpenAPI docs
├── Dockerfile
├── Makefile
└── VERSION
```

## Technology Stack

| Component       | Technology |
|-----------------|------------|
| Language        | Go 1.24+ |
| HTTP framework  | Gin |
| WhatsApp        | [whatsmeow](https://github.com/tulir/whatsmeow) |
| Database        | PostgreSQL |
| ORM             | GORM |
| Message queue   | RabbitMQ, NATS |
| Object storage  | MinIO / S3 |
| API docs        | Swagger / OpenAPI |
| Container       | Docker |

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License

WebAPP-Wago is licensed under the **Apache License 2.0**. See [LICENSE](./LICENSE).

This project is a derivative of [Evolution Go](https://github.com/EvolutionAPI/evolution-go); see [NOTICE](./NOTICE) for the original attribution and the list of changes made in this fork.

## Acknowledgments

- [whatsmeow](https://github.com/tulir/whatsmeow) by [tulir](https://github.com/tulir) — the underlying WhatsApp protocol library.
- [Evolution Go](https://github.com/EvolutionAPI/evolution-go) by Evolution Foundation — original codebase this fork is based on.

## Telemetry

WebAPP-Wago has **telemetry disabled** by default in this fork. No data is sent externally unless you explicitly enable it via configuration.

---

<div align="center">

**WebAPP-Wago** — High-Performance WhatsApp API

© 2026 WebAPP-Wago Contributors · Licensed Apache 2.0

</div>
