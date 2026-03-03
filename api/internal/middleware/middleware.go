package middleware

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupMiddleware configures all middleware for the application
func SetupMiddleware(app *fiber.App, environment string) {
	// Recover from panics
	app.Use(recover.New())

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(environment),
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Site-ID",
	}))

	// Request logging
	app.Use(requestLogger())
}

func getAllowedOrigins(environment string) string {
	if environment == "development" {
		return "*"
	}
	// Production: restrict to known domains
	return "https://siliconsoup.co.uk,https://www.siliconsoup.co.uk,https://shop.siliconsoup.co.uk"
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

func requestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		duration := time.Since(start)
		log.Printf("%s %s %d %v",
			c.Method(),
			c.Path(),
			c.Response().StatusCode(),
			duration,
		)

		return err
	}
}
