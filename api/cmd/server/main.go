package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/siliconsoup/api/internal/config"
	"github.com/siliconsoup/api/internal/database"
	"github.com/siliconsoup/api/internal/handlers"
	"github.com/siliconsoup/api/internal/mailer"
	"github.com/siliconsoup/api/internal/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Starting SiliconSoup API server...")
	log.Printf("Environment: %s", cfg.Environment)

	if cfg.AdminAPIKey == "" {
		log.Fatalf("ADMIN_API_KEY env var is required")
	}

	// Connect to database
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()
	log.Printf("Connected to database")

	// Run migrations
	if err := database.RunMigrations(database.GetDB(), "migrations"); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Printf("Migrations complete")

	// Get site ID — required for all DB queries
	siteID := cfg.SiteID
	if siteID == "" {
		// Fall back to DB lookup by slug
		var id string
		err := database.GetDB().QueryRow(context.Background(),
			"SELECT id FROM sites WHERE slug = 'siliconsoup'").Scan(&id)
		if err != nil {
			log.Fatalf("Could not resolve site ID — set SITE_ID env var or ensure a 'siliconsoup' slug exists in the DB")
		}
		siteID = id
	}
	log.Printf("Using site ID: %s", siteID)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "SiliconSoup API",
		BodyLimit: 8 * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Setup middleware
	middleware.SetupMiddleware(app, cfg.Environment, cfg.NtfyTopic)

	// Site-switching middleware — reads optional X-Site-ID header on every request
	app.Use(middleware.SiteMiddleware(database.GetDB()))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "siliconsoup-api",
		})
	})

	// Serve uploaded files (in production, Caddy handles this)
	app.Static("/uploads", "./uploads")

	// Initialize mailer
	m := mailer.New(cfg.SmtpHost, cfg.SmtpPort, cfg.SmtpUser, cfg.SmtpPass, cfg.OrderNotificationEmail)
	if !m.Enabled() {
		log.Printf("Warning: SMTP not configured — emails disabled")
	}

	// Initialize handlers
	productHandler := handlers.NewProductHandler(database.GetDB(), siteID)
	categoryHandler := handlers.NewCategoryHandler(database.GetDB(), siteID)
	shippingHandler := handlers.NewShippingHandler(database.GetDB(), siteID)
	adminHandler := handlers.NewAdminHandler(database.GetDB(), siteID, "./uploads", cfg.MyMemoryEmail)
	reviewHandler := handlers.NewReviewHandler(database.GetDB(), siteID)
	orderHandler := handlers.NewOrderHandler(
		database.GetDB(), siteID,
		cfg.PayPalClientID, cfg.PayPalClientSecret, cfg.PayPalEnv,
		m,
	)
	contactHandler := handlers.NewContactHandler(m)
	announcementHandler := handlers.NewAnnouncementHandler(database.GetDB(), siteID)

	// API routes
	api := app.Group("/api")

	// Public endpoints
	api.Get("/products", productHandler.ListProducts)
	api.Get("/products/:slug", productHandler.GetProduct)
	api.Get("/products/:slug/reviews", reviewHandler.ListProductReviews)
	api.Post("/products/:slug/reviews", reviewHandler.CreateReview)
	api.Get("/categories", categoryHandler.ListCategories)
	api.Get("/shipping-zones", shippingHandler.ListShippingZones)
	api.Get("/announcements", announcementHandler.ListAnnouncements)

	// PayPal checkout (public — no API key needed, but PayPal credentials required server-side)
	api.Post("/paypal/create-order", orderHandler.CreatePayPalOrder)
	api.Post("/paypal/capture-order", orderHandler.CapturePayPalOrder)

	// Record a pre-captured order from an external storefront (e.g. Gardapis)
	// Protected — send Authorization: Bearer <ADMIN_API_KEY> + X-Site-ID header
	api.Post("/orders/record", middleware.AdminAuth(cfg.AdminAPIKey), orderHandler.RecordOrder)

	// Contact form (rate limited — 5 submissions per IP per hour)
	api.Post("/contact", middleware.RateLimit(5, time.Hour), contactHandler.Send)

	// Admin endpoints (protected by API key)
	admin := api.Group("/admin", middleware.AdminAuth(cfg.AdminAPIKey))
	admin.Get("/sites", adminHandler.ListSites)
	admin.Post("/upload", adminHandler.UploadImage)

	// Image Store
	admin.Get("/images", adminHandler.ListImages)
	admin.Post("/images", adminHandler.UploadToStore)
	admin.Delete("/images/:id", adminHandler.DeleteImage)

	// Categories
	admin.Post("/categories", adminHandler.CreateCategory)
	admin.Put("/categories/:id", adminHandler.UpdateCategory)
	admin.Delete("/categories/:id", adminHandler.DeleteCategory)

	// Option Groups
	admin.Get("/option-groups", adminHandler.ListOptionGroups)
	admin.Post("/option-groups", adminHandler.CreateOptionGroup)
	admin.Put("/option-groups/:id", adminHandler.UpdateOptionGroup)
	admin.Delete("/option-groups/:id", adminHandler.DeleteOptionGroup)

	// Option Values
	admin.Post("/option-values", adminHandler.CreateOptionValue)
	admin.Put("/option-values/:id", adminHandler.UpdateOptionValue)
	admin.Delete("/option-values/:id", adminHandler.DeleteOptionValue)

	// Products
	admin.Get("/products", adminHandler.ListProducts)
	admin.Post("/products", adminHandler.CreateProduct)
	admin.Put("/products/:id", adminHandler.UpdateProduct)
	admin.Delete("/products/:id", adminHandler.DeleteProduct)

	// Product Options (linking)
	admin.Post("/products/:id/translate", adminHandler.TranslateProduct)
	admin.Get("/products/:id/options", adminHandler.GetProductOptions)
	admin.Post("/product-options", adminHandler.CreateProductOption)
	admin.Delete("/product-options/:productId/:optionGroupId", adminHandler.DeleteProductOption)

	// Product Files
	admin.Get("/products/:id/files", adminHandler.ListProductFiles)
	admin.Post("/products/:id/files", adminHandler.CreateProductFile)
	admin.Delete("/product-files/:id", adminHandler.DeleteProductFile)
	admin.Post("/files/upload", adminHandler.UploadFile)

	// Reviews
	admin.Get("/reviews", adminHandler.ListReviews)
	admin.Delete("/reviews/:id", adminHandler.RemoveReview)

	// Orders
	admin.Get("/orders", orderHandler.ListOrders)
	admin.Get("/orders/:id", orderHandler.GetOrder)
	admin.Put("/orders/:id", orderHandler.UpdateOrder)

	// Shipping Zones
	admin.Post("/shipping-zones", adminHandler.AddShippingOption)
	admin.Put("/shipping-zones/:id", adminHandler.UpdateShippingZone)
	admin.Delete("/shipping-zones/:id", adminHandler.DeleteShippingZone)

	// Announcements
	admin.Get("/announcements", announcementHandler.AdminListAnnouncements)
	admin.Post("/announcements", announcementHandler.CreateAnnouncement)
	admin.Put("/announcements/:id", announcementHandler.UpdateAnnouncement)
	admin.Delete("/announcements/:id", announcementHandler.DeleteAnnouncement)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Error during shutdown: %v", err)
		}
	}()

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Server listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
