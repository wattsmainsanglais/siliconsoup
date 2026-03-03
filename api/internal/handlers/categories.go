package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type CategoryHandler struct {
	db     *pgxpool.Pool
	siteID string
}

func NewCategoryHandler(db *pgxpool.Pool, siteID string) *CategoryHandler {
	return &CategoryHandler{db: db, siteID: siteID}
}

// ListCategories returns all categories for the site
// Use ?tree=true for nested tree structure, otherwise returns flat list
func (h *CategoryHandler) ListCategories(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT id, site_id, slug, name, description, parent_id, sort_order, created_at
		FROM categories
		WHERE site_id = $1
		ORDER BY sort_order, name
	`

	rows, err := h.db.Query(ctx, query, siteIDFromCtx(c, h.siteID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch categories"})
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		err := rows.Scan(
			&cat.ID, &cat.SiteID, &cat.Slug, &cat.Name,
			&cat.Description, &cat.ParentID, &cat.SortOrder, &cat.CreatedAt,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to scan category"})
		}
		categories = append(categories, cat)
	}

	// Return tree or flat based on query param
	if c.Query("tree") == "true" {
		return c.JSON(fiber.Map{
			"categories": buildCategoryTree(categories),
			"count":      len(categories),
		})
	}

	return c.JSON(fiber.Map{
		"categories": categories,
		"count":      len(categories),
	})
}

// buildCategoryTree organizes categories into a parent-child hierarchy
func buildCategoryTree(categories []models.Category) []models.Category {
	// Map stores pointers to original slice elements
	categoryMap := make(map[string]*models.Category)
	for i := range categories {
		categoryMap[categories[i].ID] = &categories[i]
	}

	// Assign children to parents (modifies original slice via pointers)
	for i := range categories {
		if categories[i].ParentID != nil {
			if parent, ok := categoryMap[*categories[i].ParentID]; ok {
				parent.Children = append(parent.Children, categories[i])
			}
		}
	}

	// Collect root categories (now with children populated)
	var roots []models.Category
	for i := range categories {
		if categories[i].ParentID == nil {
			roots = append(roots, categories[i])
		}
	}

	return roots
}
