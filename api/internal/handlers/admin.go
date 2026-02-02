package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type AdminHandler struct {
	db         *pgxpool.Pool
	siteID     string
	uploadPath string
}

func NewAdminHandler(db *pgxpool.Pool, siteID string, uploadPath string) *AdminHandler {
	return &AdminHandler{db: db, siteID: siteID, uploadPath: uploadPath}
}

// UploadImage handles image uploads
func (h *AdminHandler) UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No image provided"})
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowedExts[ext] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid file type. Allowed: jpg, jpeg, png, webp, gif"})
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File too large. Max 5MB"})
	}

	// Get subfolder from form (products, options, etc.)
	subfolder := c.FormValue("folder", "products")
	uploadDir := filepath.Join(h.uploadPath, subfolder)

	// Ensure upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s-%d%s", uuid.New().String()[:8], time.Now().Unix(), ext)
	destPath := filepath.Join(uploadDir, filename)

	// Save file
	src, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open uploaded file"})
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write file"})
	}

	return c.Status(201).JSON(fiber.Map{
		"filename": filename,
		"folder":   subfolder,
		"path":     fmt.Sprintf("/uploads/%s/%s", subfolder, filename),
	})
}

// CreateCategory creates a new category
func (h *AdminHandler) CreateCategory(c *fiber.Ctx) error {
	var req models.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate required fields
	if req.Slug == "" || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "slug and name are required"})
	}

	ctx := context.Background()
	id := uuid.New().String()

	query := `
		INSERT INTO categories (id, site_id, slug, name, description, parent_id, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, site_id, slug, name, description, parent_id, sort_order, created_at
	`

	var cat models.Category
	err := h.db.QueryRow(ctx, query,
		id, h.siteID, req.Slug, req.Name, req.Description, req.ParentID, req.SortOrder,
	).Scan(&cat.ID, &cat.SiteID, &cat.Slug, &cat.Name, &cat.Description, &cat.ParentID, &cat.SortOrder, &cat.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(409).JSON(fiber.Map{"error": "Category with this slug already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create category", "details": err.Error()})
	}

	return c.Status(201).JSON(cat)
}

// CreateOptionGroup creates a new option group
func (h *AdminHandler) CreateOptionGroup(c *fiber.Ctx) error {
	var req models.CreateOptionGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}

	// Validate type
	validTypes := map[string]bool{"select": true, "multiselect": true, "text": true, "number": true}
	if !validTypes[req.Type] {
		req.Type = "select" // default
	}

	ctx := context.Background()
	id := uuid.New().String()

	query := `
		INSERT INTO option_groups (id, site_id, name, type, required)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, site_id, name, type, required, created_at
	`

	var og models.OptionGroup
	err := h.db.QueryRow(ctx, query,
		id, h.siteID, req.Name, req.Type, req.Required,
	).Scan(&og.ID, &og.SiteID, &og.Name, &og.Type, &og.Required, &og.CreatedAt)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create option group", "details": err.Error()})
	}

	return c.Status(201).JSON(og)
}

// CreateOptionValue creates a new option value
func (h *AdminHandler) CreateOptionValue(c *fiber.Ctx) error {
	var req models.CreateOptionValueRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.OptionGroupID == "" || req.Value == "" || req.Label == "" {
		return c.Status(400).JSON(fiber.Map{"error": "option_group_id, value, and label are required"})
	}

	ctx := context.Background()
	id := uuid.New().String()

	query := `
		INSERT INTO option_values (id, option_group_id, value, label, price_modifier_pence, sort_order, is_default)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, created_at
	`

	var ov models.OptionValue
	err := h.db.QueryRow(ctx, query,
		id, req.OptionGroupID, req.Value, req.Label, req.PriceModifierPence, req.SortOrder, req.IsDefault,
	).Scan(&ov.ID, &ov.OptionGroupID, &ov.Value, &ov.Label, &ov.PriceModifierPence, &ov.SortOrder, &ov.IsDefault, &ov.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid option_group_id"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create option value", "details": err.Error()})
	}

	return c.Status(201).JSON(ov)
}

// CreateProduct creates a new product
func (h *AdminHandler) CreateProduct(c *fiber.Ctx) error {
	var req models.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Slug == "" || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "slug and name are required"})
	}

	if req.Status == "" {
		req.Status = "draft"
	}

	// Convert images to JSON
	imagesJSON, err := json.Marshal(req.Images)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid images format"})
	}

	ctx := context.Background()
	id := uuid.New().String()

	query := `
		INSERT INTO products (id, site_id, category_id, slug, name, description, short_description,
			base_price_pence, sku, weight_grams, images, status, featured)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, site_id, category_id, slug, name, description, short_description,
			base_price_pence, sku, weight_grams, images, status, featured, created_at, updated_at
	`

	var p models.Product
	err = h.db.QueryRow(ctx, query,
		id, h.siteID, req.CategoryID, req.Slug, req.Name, req.Description, req.ShortDescription,
		req.BasePricePence, req.SKU, req.WeightGrams, imagesJSON, req.Status, req.Featured,
	).Scan(&p.ID, &p.SiteID, &p.CategoryID, &p.Slug, &p.Name, &p.Description, &p.ShortDescription,
		&p.BasePricePence, &p.SKU, &p.WeightGrams, &p.Images, &p.Status, &p.Featured, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(409).JSON(fiber.Map{"error": "Product with this slug already exists"})
		}
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid category_id"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create product", "details": err.Error()})
	}

	return c.Status(201).JSON(p)
}

// CreateProductOption links a product to an option group
func (h *AdminHandler) CreateProductOption(c *fiber.Ctx) error {
	var req models.CreateProductOptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.ProductID == "" || req.OptionGroupID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "product_id and option_group_id are required"})
	}

	ctx := context.Background()

	query := `
		INSERT INTO product_options (product_id, option_group_id, sort_order)
		VALUES ($1, $2, $3)
		RETURNING product_id, option_group_id, sort_order
	`

	var productID, optionGroupID string
	var sortOrder int
	err := h.db.QueryRow(ctx, query,
		req.ProductID, req.OptionGroupID, req.SortOrder,
	).Scan(&productID, &optionGroupID, &sortOrder)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(409).JSON(fiber.Map{"error": "Product already linked to this option group"})
		}
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid product_id or option_group_id"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to link product to option group", "details": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"product_id":      productID,
		"option_group_id": optionGroupID,
		"sort_order":      sortOrder,
	})
}
