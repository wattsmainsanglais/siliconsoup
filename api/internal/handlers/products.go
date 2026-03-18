package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type ProductHandler struct {
	db     *pgxpool.Pool
	siteID string
}

func NewProductHandler(db *pgxpool.Pool, siteID string) *ProductHandler {
	return &ProductHandler{db: db, siteID: siteID}
}

// ListProducts returns all active products with basic info
func (h *ProductHandler) ListProducts(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT
			p.id, p.slug, p.name, p.short_description, p.base_price_pence,
			p.images, p.status, p.featured,
			cat.slug as category_slug, cat.name as category_name,
			EXISTS(SELECT 1 FROM product_options po WHERE po.product_id = p.id) as has_options,
			p.translations
		FROM products p
		LEFT JOIN categories cat ON p.category_id = cat.id
		WHERE p.site_id = $1 AND p.status = 'active'
		ORDER BY p.featured DESC, p.name ASC
	`

	rows, err := h.db.Query(ctx, query, siteIDFromCtx(c, h.siteID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch products"})
	}
	defer rows.Close()

	var products []models.ProductListItem
	for rows.Next() {
		var p models.ProductListItem
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Name, &p.ShortDescription, &p.BasePricePence,
			&p.Images, &p.Status, &p.Featured,
			&p.CategorySlug, &p.CategoryName, &p.HasOptions, &p.Translations,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to scan product"})
		}
		products = append(products, p)
	}

	return c.JSON(fiber.Map{
		"products": products,
		"count":    len(products),
	})
}

// GetProduct returns a single product with full details and options
func (h *ProductHandler) GetProduct(c *fiber.Ctx) error {
	ctx := context.Background()
	slug := c.Params("slug")

	// Get product
	productQuery := `
		SELECT
			p.id, p.site_id, p.category_id, p.slug, p.name, p.description,
			p.short_description, p.base_price_pence, p.sku, p.weight_grams,
			p.dimensions, p.images, p.status, p.featured, p.translations,
			p.created_at, p.updated_at
		FROM products p
		WHERE p.site_id = $1 AND p.slug = $2 AND p.status = 'active'
	`

	var product models.Product
	err := h.db.QueryRow(ctx, productQuery, siteIDFromCtx(c, h.siteID), slug).Scan(
		&product.ID, &product.SiteID, &product.CategoryID, &product.Slug,
		&product.Name, &product.Description, &product.ShortDescription,
		&product.BasePricePence, &product.SKU, &product.WeightGrams,
		&product.Dimensions, &product.Images, &product.Status, &product.Featured, &product.Translations,
		&product.CreatedAt, &product.UpdatedAt,
	)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	// Get category if exists
	if product.CategoryID != nil {
		var category models.Category
		catQuery := `SELECT id, site_id, slug, name, description, parent_id, sort_order, created_at
					 FROM categories WHERE id = $1`
		err := h.db.QueryRow(ctx, catQuery, *product.CategoryID).Scan(
			&category.ID, &category.SiteID, &category.Slug, &category.Name,
			&category.Description, &category.ParentID, &category.SortOrder, &category.CreatedAt,
		)
		if err == nil {
			product.Category = &category
		}
	}

	// Get option groups for this product
	optionGroupsQuery := `
		SELECT og.id, og.site_id, og.name, og.type, og.required, po.sort_order, og.created_at
		FROM option_groups og
		INNER JOIN product_options po ON og.id = po.option_group_id
		WHERE po.product_id = $1
		ORDER BY po.sort_order
	`

	ogRows, err := h.db.Query(ctx, optionGroupsQuery, product.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch option groups"})
	}
	defer ogRows.Close()

	var optionGroups []models.OptionGroup
	for ogRows.Next() {
		var og models.OptionGroup
		err := ogRows.Scan(&og.ID, &og.SiteID, &og.Name, &og.Type, &og.Required, &og.SortOrder, &og.CreatedAt)
		if err != nil {
			continue
		}
		optionGroups = append(optionGroups, og)
	}

	// Get option values for each group
	for i := range optionGroups {
		valuesQuery := `
			SELECT id, option_group_id, value, label, price_modifier_pence, sort_order, is_default, image, created_at
			FROM option_values
			WHERE option_group_id = $1
			ORDER BY sort_order
		`
		vRows, err := h.db.Query(ctx, valuesQuery, optionGroups[i].ID)
		if err != nil {
			continue
		}

		var values []models.OptionValue
		for vRows.Next() {
			var v models.OptionValue
			err := vRows.Scan(&v.ID, &v.OptionGroupID, &v.Value, &v.Label,
				&v.PriceModifierPence, &v.SortOrder, &v.IsDefault, &v.Image, &v.CreatedAt)
			if err != nil {
				continue
			}
			values = append(values, v)
		}
		vRows.Close()
		optionGroups[i].Values = values
	}

	product.OptionGroups = optionGroups

	// Get downloadable files for this product
	filesRows, err := h.db.Query(ctx,
		`SELECT id, product_id, title, type, url, sort_order, created_at
		 FROM product_files WHERE product_id = $1 ORDER BY sort_order, created_at`,
		product.ID,
	)
	if err == nil {
		var files []models.ProductFile
		for filesRows.Next() {
			var f models.ProductFile
			if err := filesRows.Scan(&f.ID, &f.ProductID, &f.Title, &f.Type, &f.URL, &f.SortOrder, &f.CreatedAt); err == nil {
				files = append(files, f)
			}
		}
		filesRows.Close()
		product.Files = files
	}

	return c.JSON(product)
}
