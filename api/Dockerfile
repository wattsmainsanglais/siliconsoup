# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Production stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates, su-exec for dropping privileges
RUN apk --no-cache add ca-certificates tzdata su-exec

# Copy binary, migrations, and entrypoint
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Create non-root user and uploads directory
RUN adduser -D -g '' appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appuser /app/uploads

EXPOSE 8080

# Start as root, entrypoint fixes volume permissions then drops to appuser
CMD ["./entrypoint.sh"]
