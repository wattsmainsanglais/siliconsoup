package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
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
	db            *pgxpool.Pool
	siteID        string
	uploadPath    string
	myMemoryEmail string
}

func NewAdminHandler(db *pgxpool.Pool, siteID string, uploadPath string, myMemoryEmail string) *AdminHandler {
	return &AdminHandler{db: db, siteID: siteID, uploadPath: uploadPath, myMemoryEmail: myMemoryEmail}
}

// ListSites returns all sites for the site switcher
func (h *AdminHandler) ListSites(c *fiber.Ctx) error {
	ctx := context.Background()

	rows, err := h.db.Query(ctx, `SELECT id, slug, name, currency FROM sites ORDER BY name`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sites"})
	}
	defer rows.Close()

	type Site struct {
		ID       string `json:"id"`
		Slug     string `json:"slug"`
		Name     string `json:"name"`
		Currency string `json:"currency"`
	}

	var sites []Site
	for rows.Next() {
		var s Site
		if err := rows.Scan(&s.ID, &s.Slug, &s.Name, &s.Currency); err != nil {
			continue
		}
		sites = append(sites, s)
	}

	if sites == nil {
		sites = []Site{}
	}

	return c.JSON(fiber.Map{"sites": sites, "count": len(sites)})
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
			productID, siteIDFromCtx(c, h.siteID),
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
			updatedImages, productID, siteIDFromCtx(c, h.siteID),
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

// ============ IMAGE STORE HANDLERS ============

// ListImages returns all images in the store
func (h *AdminHandler) ListImages(c *fiber.Ctx) error {
	ctx := context.Background()

	rows, err := h.db.Query(ctx,
		"SELECT id, filename, url, COALESCE(alt, ''), size_bytes, created_at FROM images ORDER BY created_at DESC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch images"})
	}
	defer rows.Close()

	var images []models.Image
	for rows.Next() {
		var img models.Image
		if err := rows.Scan(&img.ID, &img.Filename, &img.URL, &img.Alt, &img.SizeBytes, &img.CreatedAt); err != nil {
			continue
		}
		images = append(images, img)
	}

	if images == nil {
		images = []models.Image{}
	}

	return c.JSON(fiber.Map{
		"images": images,
		"count":  len(images),
	})
}

// UploadToStore uploads an image to the central store
func (h *AdminHandler) UploadToStore(c *fiber.Ctx) error {
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

	uploadDir := filepath.Join(h.uploadPath, "products")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	filename := fmt.Sprintf("%s-%d%s", uuid.New().String()[:8], time.Now().Unix(), ext)
	destPath := filepath.Join(uploadDir, filename)

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

	imagePath := fmt.Sprintf("/uploads/products/%s", filename)
	sizeBytes := int(file.Size)
	alt := c.FormValue("alt", "")

	ctx := context.Background()
	var img models.Image
	err = h.db.QueryRow(ctx,
		`INSERT INTO images (filename, url, alt, size_bytes) VALUES ($1, $2, $3, $4)
		 RETURNING id, filename, url, COALESCE(alt, ''), size_bytes, created_at`,
		filename, imagePath, alt, sizeBytes,
	).Scan(&img.ID, &img.Filename, &img.URL, &img.Alt, &img.SizeBytes, &img.CreatedAt)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save image record", "details": err.Error()})
	}

	return c.Status(201).JSON(img)
}

// DeleteImage removes an image from the store, disk, and any product/option references
func (h *AdminHandler) DeleteImage(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	// Get image record
	var url, filename string
	err := h.db.QueryRow(ctx, "SELECT url, filename FROM images WHERE id = $1", id).Scan(&url, &filename)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Image not found"})
	}

	// Delete from images table
	_, err = h.db.Exec(ctx, "DELETE FROM images WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete image record"})
	}

	// Remove from any products.images JSONB arrays that reference this URL
	_, _ = h.db.Exec(ctx, `
		UPDATE products
		SET images = (
			SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
			FROM jsonb_array_elements(images) AS elem
			WHERE elem->>'url' != $1
		),
		updated_at = NOW()
		WHERE images @> jsonb_build_array(jsonb_build_object('url', $1::text))
	`, url)

	// Clear any option_values.image fields that reference this URL
	_, _ = h.db.Exec(ctx, "UPDATE option_values SET image = NULL WHERE image = $1", url)

	// Delete file from disk
	relativePath := strings.TrimPrefix(url, "/uploads/")
	filePath := filepath.Join(h.uploadPath, relativePath)
	os.Remove(filePath)

	return c.Status(204).Send(nil)
}

// ListProducts returns ALL products for admin (including drafts/archived)
func (h *AdminHandler) ListProducts(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT p.id, p.slug, p.name, p.description, p.short_description, p.base_price_pence,
			p.weight_grams, p.dimensions, p.images, p.status, p.featured, p.category_id,
			c.slug as category_slug, c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.site_id = $1
		ORDER BY p.created_at DESC
	`

	rows, err := h.db.Query(ctx, query, siteIDFromCtx(c, h.siteID))
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
		WeightGrams      *int            `json:"weight_grams,omitempty"`
		Dimensions       json.RawMessage `json:"dimensions,omitempty"`
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
			&p.WeightGrams, &p.Dimensions, &p.Images, &p.Status, &p.Featured, &p.CategoryID, &p.CategorySlug, &p.CategoryName)
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
		id, siteIDFromCtx(c, h.siteID), req.Slug, req.Name, req.Description, req.ParentID, req.SortOrder,
	).Scan(&cat.ID, &cat.SiteID, &cat.Slug, &cat.Name, &cat.Description, &cat.ParentID, &cat.SortOrder, &cat.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(409).JSON(fiber.Map{"error": "Category with this slug already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create category", "details": err.Error()})
	}

	return c.Status(201).JSON(cat)
}

// ListOptionGroups returns all option groups with their values
func (h *AdminHandler) ListOptionGroups(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT og.id, og.site_id, og.name, og.type, og.required, og.created_at
		FROM option_groups og
		WHERE og.site_id = $1
		ORDER BY og.name
	`

	rows, err := h.db.Query(ctx, query, siteIDFromCtx(c, h.siteID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch option groups"})
	}
	defer rows.Close()

	var groups []models.OptionGroup
	for rows.Next() {
		var og models.OptionGroup
		err := rows.Scan(&og.ID, &og.SiteID, &og.Name, &og.Type, &og.Required, &og.CreatedAt)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to scan option group"})
		}
		groups = append(groups, og)
	}

	// Fetch values for each group
	for i := range groups {
		valuesQuery := `
			SELECT id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, image, created_at
			FROM option_values
			WHERE option_group_id = $1
			ORDER BY sort_order, label
		`
		valueRows, err := h.db.Query(ctx, valuesQuery, groups[i].ID)
		if err != nil {
			continue
		}

		var values []models.OptionValue
		for valueRows.Next() {
			var ov models.OptionValue
			valueRows.Scan(&ov.ID, &ov.OptionGroupID, &ov.Value, &ov.Label, &ov.PriceModifierPence, &ov.SortOrder, &ov.IsDefault, &ov.Image, &ov.CreatedAt)
			values = append(values, ov)
		}
		valueRows.Close()
		groups[i].Values = values
	}

	return c.JSON(fiber.Map{
		"option_groups": groups,
		"count":         len(groups),
	})
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
		id, siteIDFromCtx(c, h.siteID), req.Name, req.Type, req.Required,
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
		INSERT INTO option_values (id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, image)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, image, created_at
	`

	var ov models.OptionValue
	err := h.db.QueryRow(ctx, query,
		id, req.OptionGroupID, req.Value, req.Label, req.PriceModifierPence, req.SortOrder, req.IsDefault, req.Image,
	).Scan(&ov.ID, &ov.OptionGroupID, &ov.Value, &ov.Label, &ov.PriceModifierPence, &ov.SortOrder, &ov.IsDefault, &ov.Image, &ov.CreatedAt)

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
			base_price_pence, sku, weight_grams, dimensions, images, status, featured)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, site_id, category_id, slug, name, description, short_description,
			base_price_pence, sku, weight_grams, dimensions, images, status, featured, created_at, updated_at
	`

	var p models.Product
	err = h.db.QueryRow(ctx, query,
		id, siteIDFromCtx(c, h.siteID), req.CategoryID, req.Slug, req.Name, req.Description, req.ShortDescription,
		req.BasePricePence, req.SKU, req.WeightGrams, req.Dimensions, imagesJSON, req.Status, req.Featured,
	).Scan(&p.ID, &p.SiteID, &p.CategoryID, &p.Slug, &p.Name, &p.Description, &p.ShortDescription,
		&p.BasePricePence, &p.SKU, &p.WeightGrams, &p.Dimensions, &p.Images, &p.Status, &p.Featured, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(409).JSON(fiber.Map{"error": "Product with this slug already exists"})
		}
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid category_id"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create product", "details": err.Error()})
	}

	// Seed translations with English content so the column is never NULL.
	// The Translate button will overwrite these with real translations later.
	if err := seedTranslations(h.db, p.ID, p.ShortDescription, p.Description); err != nil {
		log.Printf("[translate] failed to seed translations for product %s: %v", p.ID, err)
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
		req.Slug, req.Name, req.Description, req.ParentID, req.SortOrder, id, siteIDFromCtx(c, h.siteID),
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
		req.Name, req.Type, req.Required, id, siteIDFromCtx(c, h.siteID),
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

	// Determine image value for update: if provided use it, otherwise preserve existing
	var imageVal *string
	if req.Image != nil {
		imageVal = req.Image
	}

	query := `
		UPDATE option_values
		SET value = COALESCE(NULLIF($1, ''), value),
			label = COALESCE(NULLIF($2, ''), label),
			price_modifier_pence = $3,
			sort_order = $4,
			is_default = $5,
			image = COALESCE($6, image)
		WHERE id = $7
		RETURNING id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, image, created_at
	`

	var ov models.OptionValue
	err := h.db.QueryRow(ctx, query,
		req.Value, req.Label, req.PriceModifierPence, req.SortOrder, req.IsDefault, imageVal, id,
	).Scan(&ov.ID, &ov.OptionGroupID, &ov.Value, &ov.Label, &ov.PriceModifierPence, &ov.SortOrder, &ov.IsDefault, &ov.Image, &ov.CreatedAt)

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

	// Only marshal images if provided, otherwise pass nil to preserve existing
	var imagesJSON interface{}
	if req.Images != nil {
		j, err := json.Marshal(req.Images)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid images format"})
		}
		imagesJSON = j
	}

	ctx := context.Background()

	query := `
		UPDATE products
		SET category_id = $1,
			slug = COALESCE(NULLIF($2, ''), slug),
			name = COALESCE(NULLIF($3, ''), name),
			description = COALESCE($4, description),
			short_description = COALESCE($5, short_description),
			base_price_pence = $6,
			sku = COALESCE($7, sku),
			weight_grams = $8,
			dimensions = $9,
			images = COALESCE($10, images),
			status = COALESCE(NULLIF($11, ''), status),
			featured = $12,
			updated_at = NOW()
		WHERE id = $13 AND site_id = $14
		RETURNING id, site_id, category_id, slug, name, description, short_description,
			base_price_pence, sku, weight_grams, dimensions, images, status, featured, created_at, updated_at
	`

	var p models.Product
	var err error
	err = h.db.QueryRow(ctx, query,
		req.CategoryID, req.Slug, req.Name, req.Description, req.ShortDescription,
		req.BasePricePence, req.SKU, req.WeightGrams, req.Dimensions, imagesJSON, req.Status, req.Featured,
		id, siteIDFromCtx(c, h.siteID),
	).Scan(&p.ID, &p.SiteID, &p.CategoryID, &p.Slug, &p.Name, &p.Description, &p.ShortDescription,
		&p.BasePricePence, &p.SKU, &p.WeightGrams, &p.Dimensions, &p.Images, &p.Status, &p.Featured, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update product", "details": err.Error()})
	}

	return c.JSON(p)
}

// TranslateProduct translates a single product's descriptions on demand.
// Called manually from the admin UI — avoids burning MyMemory quota on every save.
func (h *AdminHandler) TranslateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	var shortDesc *string
	var desc *string
	err := h.db.QueryRow(ctx,
		"SELECT short_description, description FROM products WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID),
	).Scan(&shortDesc, &desc)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch product", "details": err.Error()})
	}

	translationsJSON, err := translateProduct(h.db, id, shortDesc, desc, h.myMemoryEmail)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"translations": translationsJSON})
}

// ============ DELETE HANDLERS ============

// DeleteCategory deletes a category
func (h *AdminHandler) DeleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM categories WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID))

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
		id, siteIDFromCtx(c, h.siteID))

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

// DeleteProduct deletes a product and its associated images
func (h *AdminHandler) DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	// Fetch product images before deletion
	var imagesJSON json.RawMessage
	err := h.db.QueryRow(ctx,
		"SELECT COALESCE(images, '[]'::jsonb) FROM products WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID),
	).Scan(&imagesJSON)

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	// Parse images to get file paths
	var images []map[string]interface{}
	if err := json.Unmarshal(imagesJSON, &images); err != nil {
		images = []map[string]interface{}{}
	}

	// Delete the product from DB
	result, err := h.db.Exec(ctx,
		"DELETE FROM products WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete product"})
	}

	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	// Delete associated image files from disk
	var deletedFiles []string
	var failedFiles []string
	for _, img := range images {
		if url, ok := img["url"].(string); ok {
			// url is like "/uploads/products/abc-123.jpg"
			// Convert to filesystem path
			relativePath := strings.TrimPrefix(url, "/uploads/")
			filePath := filepath.Join(h.uploadPath, relativePath)

			if err := os.Remove(filePath); err != nil {
				if !os.IsNotExist(err) {
					failedFiles = append(failedFiles, url)
				}
			} else {
				deletedFiles = append(deletedFiles, url)
			}
		}
	}

	// Return 204 with no body for clean delete, or 200 with details if there were issues
	if len(failedFiles) > 0 {
		return c.Status(200).JSON(fiber.Map{
			"message":       "Product deleted, but some images could not be removed",
			"deleted_files": deletedFiles,
			"failed_files":  failedFiles,
		})
	}

	return c.Status(204).Send(nil)
}

// GetProductOptions returns option groups linked to a product
func (h *AdminHandler) GetProductOptions(c *fiber.Ctx) error {
	productID := c.Params("id")
	ctx := context.Background()

	query := `
		SELECT og.id, og.site_id, og.name, og.type, og.required, po.sort_order, og.created_at
		FROM option_groups og
		INNER JOIN product_options po ON og.id = po.option_group_id
		WHERE po.product_id = $1
		ORDER BY po.sort_order
	`

	rows, err := h.db.Query(ctx, query, productID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch product options"})
	}
	defer rows.Close()

	var groups []models.OptionGroup
	for rows.Next() {
		var og models.OptionGroup
		err := rows.Scan(&og.ID, &og.SiteID, &og.Name, &og.Type, &og.Required, &og.SortOrder, &og.CreatedAt)
		if err != nil {
			continue
		}
		groups = append(groups, og)
	}

	return c.JSON(fiber.Map{
		"option_groups": groups,
		"count":         len(groups),
	})
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
