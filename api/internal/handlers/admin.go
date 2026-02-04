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
// Optional form fields: product_id (links image to product), alt (image alt text)
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

	imagePath := fmt.Sprintf("/uploads/%s/%s", subfolder, filename)

	// If product_id provided, update the product's images array
	productID := c.FormValue("product_id", "")
	if productID != "" {
		altText := c.FormValue("alt", "")
		ctx := context.Background()

		// Get current images
		var currentImages json.RawMessage
		err := h.db.QueryRow(ctx,
			"SELECT COALESCE(images, '[]'::jsonb) FROM products WHERE id = $1 AND site_id = $2",
			productID, h.siteID,
		).Scan(&currentImages)

		if err != nil {
			// Product not found, but file was saved - return success with warning
			return c.Status(201).JSON(fiber.Map{
				"filename": filename,
				"folder":   subfolder,
				"path":     imagePath,
				"warning":  "Product not found, image saved but not linked",
			})
		}

		// Parse existing images
		var images []map[string]interface{}
		if err := json.Unmarshal(currentImages, &images); err != nil {
			images = []map[string]interface{}{}
		}

		// Determine sort order (append to end)
		sortOrder := len(images) + 1

		// Add new image
		newImage := map[string]interface{}{
			"url":        imagePath,
			"alt":        altText,
			"sort_order": sortOrder,
		}
		images = append(images, newImage)

		// Update product
		updatedImages, _ := json.Marshal(images)
		_, err = h.db.Exec(ctx,
			"UPDATE products SET images = $1, updated_at = NOW() WHERE id = $2 AND site_id = $3",
			updatedImages, productID, h.siteID,
		)

		if err != nil {
			return c.Status(201).JSON(fiber.Map{
				"filename": filename,
				"folder":   subfolder,
				"path":     imagePath,
				"warning":  "Image saved but failed to update product: " + err.Error(),
			})
		}

		return c.Status(201).JSON(fiber.Map{
			"filename":   filename,
			"folder":     subfolder,
			"path":       imagePath,
			"product_id": productID,
			"images":     images,
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"filename": filename,
		"folder":   subfolder,
		"path":     imagePath,
	})
}

// ListProducts returns ALL products for admin (including drafts/archived)
func (h *AdminHandler) ListProducts(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT p.id, p.slug, p.name, p.description, p.short_description, p.base_price_pence,
			p.images, p.status, p.featured, p.category_id,
			c.slug as category_slug, c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.site_id = $1
		ORDER BY p.created_at DESC
	`

	rows, err := h.db.Query(ctx, query, h.siteID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch products"})
	}
	defer rows.Close()

	// Admin-specific product struct with all fields needed for editing
	type AdminProduct struct {
		ID               string          `json:"id"`
		Slug             string          `json:"slug"`
		Name             string          `json:"name"`
		Description      *string         `json:"description,omitempty"`
		ShortDescription *string         `json:"short_description,omitempty"`
		BasePricePence   int             `json:"base_price_pence"`
		Images           json.RawMessage `json:"images"`
		Status           string          `json:"status"`
		Featured         bool            `json:"featured"`
		CategoryID       *string         `json:"category_id,omitempty"`
		CategorySlug     *string         `json:"category_slug,omitempty"`
		CategoryName     *string         `json:"category_name,omitempty"`
	}

	var products []AdminProduct
	for rows.Next() {
		var p AdminProduct
		err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.Description, &p.ShortDescription, &p.BasePricePence,
			&p.Images, &p.Status, &p.Featured, &p.CategoryID, &p.CategorySlug, &p.CategoryName)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to scan product", "details": err.Error()})
		}

		products = append(products, p)
	}

	return c.JSON(fiber.Map{
		"products": products,
		"count":    len(products),
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

// ============ UPDATE HANDLERS ============

// UpdateCategory updates an existing category
func (h *AdminHandler) UpdateCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx := context.Background()

	query := `
		UPDATE categories
		SET slug = COALESCE(NULLIF($1, ''), slug),
			name = COALESCE(NULLIF($2, ''), name),
			description = $3,
			parent_id = $4,
			sort_order = $5
		WHERE id = $6 AND site_id = $7
		RETURNING id, site_id, slug, name, description, parent_id, sort_order, created_at
	`

	var cat models.Category
	err := h.db.QueryRow(ctx, query,
		req.Slug, req.Name, req.Description, req.ParentID, req.SortOrder, id, h.siteID,
	).Scan(&cat.ID, &cat.SiteID, &cat.Slug, &cat.Name, &cat.Description, &cat.ParentID, &cat.SortOrder, &cat.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Category not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update category", "details": err.Error()})
	}

	return c.JSON(cat)
}

// UpdateOptionGroup updates an existing option group
func (h *AdminHandler) UpdateOptionGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.CreateOptionGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx := context.Background()

	query := `
		UPDATE option_groups
		SET name = COALESCE(NULLIF($1, ''), name),
			type = COALESCE(NULLIF($2, ''), type),
			required = $3
		WHERE id = $4 AND site_id = $5
		RETURNING id, site_id, name, type, required, created_at
	`

	var og models.OptionGroup
	err := h.db.QueryRow(ctx, query,
		req.Name, req.Type, req.Required, id, h.siteID,
	).Scan(&og.ID, &og.SiteID, &og.Name, &og.Type, &og.Required, &og.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Option group not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update option group", "details": err.Error()})
	}

	return c.JSON(og)
}

// UpdateOptionValue updates an existing option value
func (h *AdminHandler) UpdateOptionValue(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.CreateOptionValueRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx := context.Background()

	query := `
		UPDATE option_values
		SET value = COALESCE(NULLIF($1, ''), value),
			label = COALESCE(NULLIF($2, ''), label),
			price_modifier_pence = $3,
			sort_order = $4,
			is_default = $5
		WHERE id = $6
		RETURNING id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, created_at
	`

	var ov models.OptionValue
	err := h.db.QueryRow(ctx, query,
		req.Value, req.Label, req.PriceModifierPence, req.SortOrder, req.IsDefault, id,
	).Scan(&ov.ID, &ov.OptionGroupID, &ov.Value, &ov.Label, &ov.PriceModifierPence, &ov.SortOrder, &ov.IsDefault, &ov.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Option value not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update option value", "details": err.Error()})
	}

	return c.JSON(ov)
}

// UpdateProduct updates an existing product
func (h *AdminHandler) UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Convert images to JSON
	imagesJSON, err := json.Marshal(req.Images)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid images format"})
	}

	ctx := context.Background()

	query := `
		UPDATE products
		SET category_id = $1,
			slug = COALESCE(NULLIF($2, ''), slug),
			name = COALESCE(NULLIF($3, ''), name),
			description = $4,
			short_description = $5,
			base_price_pence = $6,
			sku = $7,
			weight_grams = $8,
			images = $9,
			status = COALESCE(NULLIF($10, ''), status),
			featured = $11,
			updated_at = NOW()
		WHERE id = $12 AND site_id = $13
		RETURNING id, site_id, category_id, slug, name, description, short_description,
			base_price_pence, sku, weight_grams, images, status, featured, created_at, updated_at
	`

	var p models.Product
	err = h.db.QueryRow(ctx, query,
		req.CategoryID, req.Slug, req.Name, req.Description, req.ShortDescription,
		req.BasePricePence, req.SKU, req.WeightGrams, imagesJSON, req.Status, req.Featured,
		id, h.siteID,
	).Scan(&p.ID, &p.SiteID, &p.CategoryID, &p.Slug, &p.Name, &p.Description, &p.ShortDescription,
		&p.BasePricePence, &p.SKU, &p.WeightGrams, &p.Images, &p.Status, &p.Featured, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update product", "details": err.Error()})
	}

	return c.JSON(p)
}

// ============ DELETE HANDLERS ============

// DeleteCategory deletes a category
func (h *AdminHandler) DeleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM categories WHERE id = $1 AND site_id = $2",
		id, h.siteID)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(409).JSON(fiber.Map{"error": "Cannot delete category with products or subcategories"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete category"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Category not found"})
	}

	return c.Status(204).Send(nil)
}

// DeleteOptionGroup deletes an option group
func (h *AdminHandler) DeleteOptionGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM option_groups WHERE id = $1 AND site_id = $2",
		id, h.siteID)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(409).JSON(fiber.Map{"error": "Cannot delete option group with values or linked products"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete option group"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Option group not found"})
	}

	return c.Status(204).Send(nil)
}

// DeleteOptionValue deletes an option value
func (h *AdminHandler) DeleteOptionValue(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx, "DELETE FROM option_values WHERE id = $1", id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete option value"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Option value not found"})
	}

	return c.Status(204).Send(nil)
}

// DeleteProduct deletes a product
func (h *AdminHandler) DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM products WHERE id = $1 AND site_id = $2",
		id, h.siteID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete product"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	return c.Status(204).Send(nil)
}

// DeleteProductOption removes a product-option group link
func (h *AdminHandler) DeleteProductOption(c *fiber.Ctx) error {
	productID := c.Params("productId")
	optionGroupID := c.Params("optionGroupId")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM product_options WHERE product_id = $1 AND option_group_id = $2",
		productID, optionGroupID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete product option link"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Product option link not found"})
	}

	return c.Status(204).Send(nil)
}
