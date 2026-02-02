package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// SetupMiddleware configures all middleware for the application
func SetupMiddleware(app *fiber.App, environment string) {
	// Recover from panics
	app.Use(recover.New())

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(environment),
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
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
