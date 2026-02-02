# SiliconSoup E-commerce Platform

Custom e-commerce platform for [SiliconSoup](https://siliconsoup.co.uk), featuring a flexible product options system.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Go 1.22+ (for local development)

### Development

1. Start the database:
```bash
docker compose up -d db
```

2. Run the API:
```bash
cd api
go run ./cmd/server
```

3. Test the endpoints:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/products
```

### Full Stack with Docker
```bash
docker compose up
```

4. Stop everything:
```bash
docker compose down
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | List all active products |
| GET | `/api/products/:slug` | Get product with options |
| GET | `/api/categories` | List categories |
| GET | `/api/shipping-zones` | List shipping zones |

## Project Structure

```
├── api/                  # Go backend
│   ├── cmd/server/       # Entry point
│   ├── internal/         # Application code
│   └── migrations/       # SQL migrations
├── frontend/             # Vite + React (planned)
├── docker-compose.yml    # Local development
└── CLAUDE.md            # AI context file
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=postgres://siliconsoup:localdev@localhost:5432/siliconsoup?sslmode=disable
PORT=8080
ENVIRONMENT=development
```

## License

Proprietary - SiliconSoup Ltd
