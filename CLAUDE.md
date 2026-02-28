# SiliconSoup E-commerce Platform

## Project Overview

Custom e-commerce platform for SiliconSoup (siliconsoup.co.uk), selling RFID readers and electronics for Raspberry Pi. Built to replace WooCommerce with a more flexible variant/options system.

## Tech Stack

- **Backend**: Go with Fiber framework
- **Database**: PostgreSQL 16
- **Frontend**: Vite + React (planned)
- **Deployment**: Docker Compose (local dev), VPS with Caddy (production)
- **Image Storage**: Local filesystem (`./uploads/`), bind-mounted in Docker

## Key Concepts

### Multi-Site Architecture
The system supports multiple sites (SiliconSoup, Gardapis future) via `site_id` on relevant tables. All queries should filter by site_id.

### Flexible Product Options
Unlike WooCommerce's rigid variants, products have:
- **Option Groups**: Named sets of choices (e.g., "Configuration")
- **Option Values**: Individual choices with price modifiers
- **Product Options**: Links products to their available option groups

Example: RFID Reader 125KHz
- Base price: £33.50
- Configuration options:
  - Reader Only: +£0
  - With Antenna: +£6.00
  - Full Kit: +£8.65

### Prices in Pence
All prices stored as integers in pence to avoid floating point issues.
- £33.50 = 3350
- £6.00 = 600

## Project Structure

```
siliconsoup/
├── api/
│   ├── cmd/server/main.go       # Entry point
│   ├── internal/
│   │   ├── config/              # Environment config
│   │   ├── database/            # DB connection, migrations
│   │   ├── handlers/
│   │   │   ├── products.go      # Public product endpoints
│   │   │   ├── categories.go    # Public category endpoints
│   │   │   ├── shipping.go      # Public shipping endpoints
│   │   │   └── admin.go         # All admin CRUD endpoints
│   │   ├── models/              # Data structures
│   │   └── middleware/          # CORS, logging
│   ├── migrations/              # SQL migrations
│   ├── go.mod
│   └── Dockerfile
├── uploads/                     # Image storage (bind-mounted)
│   └── products/
├── frontend/                    # Vite + React (planned)
├── docker-compose.yml
└── CLAUDE.md
```

## Development

### Start Docker machine
```bash
 sudo systemctl start docker
```


### Start Database
```bash
docker compose up -d db
```

### Run API (from api/ directory)
```bash
go run ./cmd/server
```

### Full Stack
```bash
docker compose up
```

### Stop Database
```bash
docker compose down      # Stop containers
docker compose down -v   # Stop and delete data
```

### Test Endpoints
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/products
curl http://localhost:8080/api/products/rfid-reader-125khz
curl http://localhost:8080/api/categories
curl http://localhost:8080/api/shipping-zones
```

## Database

### Key Tables
- `sites`: Multi-tenant support
- `products`: Core product data
- `option_groups`: Types of options (Configuration, Antenna Size)
- `option_values`: Individual options with price modifiers
- `product_options`: Links products to their option groups
- `orders`: Customer orders with JSONB items snapshot
- `shipping_zones`: Shipping rates by country
- `quote_requests`: Custom work enquiries

### Seed Data (pre-loaded)
- **Site**: SiliconSoup (siliconsoup.co.uk)
- **Categories**: RFID Readers, Development Boards, Accessories
- **Products**:
  - RFID Reader 125KHz (£33.50) - with Configuration options
  - RFID Reader 13.56MHz (£45.00) - with Configuration options
  - 65mm RFID Antenna (£6.00) - standalone
- **Option Groups**:
  - Configuration: Reader Only / With Antenna (+£6) / Full Kit (+£8.65)
  - Antenna Size: 30mm / 65mm / 120mm (+£5)
- **Shipping**: UK (£3.50), EU (£8.50), International (£15)

### Migrations
Run automatically on server start. Files in `api/migrations/` named like `001_initial_schema.sql`.

## API Endpoints

### Public
- `GET /api/products` - List active products
- `GET /api/products/:slug` - Product with full options
- `GET /api/categories` - Flat list (default) or nested tree with `?tree=true`
- `GET /api/shipping-zones` - Shipping rates

### Admin - Categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

### Admin - Option Groups
- `POST /api/admin/option-groups` - Create option group
- `PUT /api/admin/option-groups/:id` - Update option group
- `DELETE /api/admin/option-groups/:id` - Delete option group

### Admin - Option Values
- `POST /api/admin/option-values` - Create option value
- `PUT /api/admin/option-values/:id` - Update option value
- `DELETE /api/admin/option-values/:id` - Delete option value

### Admin - Products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

### Admin - Product Options (linking)
- `POST /api/admin/product-options` - Link product to option group
- `DELETE /api/admin/product-options/:productId/:optionGroupId` - Unlink

### Admin - Uploads
- `POST /api/admin/upload` - Upload image (form: `image` file, `folder` string)
- `GET /uploads/:folder/:filename` - Serve uploaded files


## Environment Variables

```
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=disable
PORT=8080
ENVIRONMENT=development
SITE_ID=                    # Optional, auto-detects siliconsoup
```

## Client

**Paul** - Owner of SiliconSoup. Technical background, can handle admin interface. Key requirement: ability to add product variants without developer intervention.




