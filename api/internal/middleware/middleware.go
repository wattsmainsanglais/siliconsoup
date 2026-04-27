package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupMiddleware configures all middleware for the application
func SetupMiddleware(app *fiber.App, environment string, ntfyTopic string) {
	// Recover from panics — log stack trace so panics are visible in Docker logs
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(environment),
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Site-ID",
	}))

	// Request logging + ntfy push alert on 5xx
	app.Use(requestLogger(ntfyTopic))
}

func getAllowedOrigins(environment string) string {
	if environment == "development" {
		return "*"
	}
	// Production: restrict to known domains
	return "https://siliconsoup.com,https://www.siliconsoup.com,https://siliconsoup.co.uk,https://www.siliconsoup.co.uk,https://shop.siliconsoup.co.uk,https://siliconsoup.vercel.app,https://siliconsoup-frontend-store.vercel.app,https://gardapis.vercel.app,https://gardapis.eu,https://www.gardapis.eu,https://admin.siliconsoup.com,http://localhost:5173,http://localhost:3000,http://109.106.188.7"
}

// RateLimit returns a per-IP rate limiter. max = requests allowed, window = time window.
// Example: middleware.RateLimit(5, time.Hour) — 5 requests per IP per hour.
func RateLimit(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
	})
}

// AdminAuth checks the Authorization: Bearer <key> header on admin routes.
func AdminAuth(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Get("Authorization") != "Bearer "+apiKey {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}
		return c.Next()
	}
}

// SiteMiddleware reads the optional X-Site-ID header and, if present, validates it
// against the database before injecting the value into the Fiber context as "siteID".
// When the header is absent, the request continues with the handler's startup siteID.
func SiteMiddleware(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		siteID := c.Get("X-Site-ID")
		if siteID == "" {
			return c.Next()
		}
		var exists bool
		_ = db.QueryRow(context.Background(),
			"SELECT EXISTS(SELECT 1 FROM sites WHERE id = $1)", siteID,
		).Scan(&exists)
		if !exists {
			return c.Status(400).JSON(fiber.Map{"error": "invalid site_id"})
		}
		c.Locals("siteID", siteID)
		return c.Next()
	}
}

func requestLogger(ntfyTopic string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		duration := time.Since(start)
		status := c.Response().StatusCode()
		log.Printf("%s %s %d %v", c.Method(), c.Path(), status, duration)

		if status >= 500 && ntfyTopic != "" {
			go sendAlert(ntfyTopic, fmt.Sprintf("%s %s returned %d", c.Method(), c.Path(), status))
		}

		return err
	}
}

// sendAlert posts a push notification to ntfy.sh for 5xx errors.
// Runs in a goroutine — never blocks the HTTP response.
func sendAlert(topic, message string) {
	req, err := http.NewRequest("POST", "https://ntfy.sh/"+topic, strings.NewReader(message))
	if err != nil {
		log.Printf("[ntfy] failed to build request: %v", err)
		return
	}
	req.Header.Set("Title", "SiliconSoup API Error")
	req.Header.Set("Priority", "high")
	req.Header.Set("Tags", "rotating_light")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[ntfy] failed to send alert: %v", err)
		return
	}
	resp.Body.Close()
}
