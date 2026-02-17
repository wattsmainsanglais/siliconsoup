package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/siliconsoup/api/internal/config"
	"github.com/siliconsoup/api/internal/database"
	"github.com/siliconsoup/api/internal/handlers"
	"github.com/siliconsoup/api/internal/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Starting SiliconSoup API server...")
	log.Printf("Environment: %s", cfg.Environment)

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

	// Get site ID (use default SiliconSoup site for now)
	siteID := cfg.SiteID
	if siteID == "" {
		// Look up SiliconSoup site ID from database
		var id string
		err := database.GetDB().QueryRow(context.Background(),
			"SELECT id FROM sites WHERE slug = 'siliconsoup'").Scan(&id)
		if err != nil {
			log.Printf("Warning: Could not find siliconsoup site, using empty site_id")
		} else {
			siteID = id
			log.Printf("Using site ID: %s", siteID)
		}
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "SiliconSoup API",
	})

	// Setup middleware
	middleware.SetupMiddleware(app, cfg.Environment)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "siliconsoup-api",
		})
	})

	// Serve uploaded files (in production, Caddy handles this)
	app.Static("/uploads", "./uploads")

	// Initialize handlers
	productHandler := handlers.NewProductHandler(database.GetDB(), siteID)
	categoryHandler := handlers.NewCategoryHandler(database.GetDB(), siteID)
	shippingHandler := handlers.NewShippingHandler(database.GetDB(), siteID)
	adminHandler := handlers.NewAdminHandler(database.GetDB(), siteID, "./uploads")

	// API routes
	api := app.Group("/api")

	// Public endpoints
	api.Get("/products", productHandler.ListProducts)
	api.Get("/products/:slug", productHandler.GetProduct)
	api.Get("/categories", categoryHandler.ListCategories)
	api.Get("/shipping-zones", shippingHandler.ListShippingZones)

	// Admin endpoints
	admin := api.Group("/admin")
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
	admin.Get("/products/:id/options", adminHandler.GetProductOptions)
	admin.Post("/product-options", adminHandler.CreateProductOption)
	admin.Delete("/product-options/:productId/:optionGroupId", adminHandler.DeleteProductOption)

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
