package handlers

import (
	"context"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type ReviewHandler struct {
	db     *pgxpool.Pool
	siteID string
}

func NewReviewHandler(db *pgxpool.Pool, siteID string) *ReviewHandler {
	return &ReviewHandler{db: db, siteID: siteID}
}

// ============ PUBLIC ENDPOINTS ============

// ListProductReviews returns published reviews for a product
func (h *ReviewHandler) ListProductReviews(c *fiber.Ctx) error {
	slug := c.Params("slug")
	ctx := context.Background()

	var productID string
	err := h.db.QueryRow(ctx,
		"SELECT id FROM products WHERE site_id = $1 AND slug = $2 AND status = 'active'",
		siteIDFromCtx(c, h.siteID), slug,
	).Scan(&productID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	rows, err := h.db.Query(ctx,
		`SELECT id, site_id, product_id, customer_email, display_name, rating, comment, status, created_at
		 FROM reviews
		 WHERE product_id = $1 AND status = 'published'
		 ORDER BY created_at DESC`,
		productID,
	)
	if err != nil {
		log.Printf("[reviews] ListProductReviews query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reviews"})
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var r models.Review
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ProductID, &r.CustomerEmail,
			&r.DisplayName, &r.Rating, &r.Comment, &r.Status, &r.CreatedAt); err != nil {
			continue
		}
		r.CustomerEmail = redactEmail(r.CustomerEmail)
		reviews = append(reviews, r)
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	return c.JSON(fiber.Map{"reviews": reviews, "count": len(reviews)})
}

// CreateReview submits a review — verifies purchaser by email, auto-publishes
func (h *ReviewHandler) CreateReview(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var req models.CreateReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.CustomerEmail == "" || req.DisplayName == "" || req.Comment == "" {
		return c.Status(400).JSON(fiber.Map{"error": "customer_email, display_name, and comment are required"})
	}
	if req.Rating < 1 || req.Rating > 5 {
		return c.Status(400).JSON(fiber.Map{"error": "rating must be between 1 and 5"})
	}

	ctx := context.Background()

	siteID := siteIDFromCtx(c, h.siteID)

	var productID string
	err := h.db.QueryRow(ctx,
		"SELECT id FROM products WHERE site_id = $1 AND slug = $2 AND status = 'active'",
		siteID, slug,
	).Scan(&productID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Product not found"})
	}

	// Verify the customer has a paid order containing this product
	var hasPurchased bool
	err = h.db.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM orders
			WHERE site_id = $1
			AND customer_email = $2
			AND payment_status = 'paid'
			AND items @> jsonb_build_array(jsonb_build_object('product_id', $3::text))
		)`,
		siteID, strings.ToLower(req.CustomerEmail), productID,
	).Scan(&hasPurchased)
	if err != nil {
		log.Printf("[reviews] CreateReview verify purchase: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to verify purchase"})
	}
	if !hasPurchased {
		return c.Status(403).JSON(fiber.Map{"error": "Only verified purchasers can leave a review"})
	}

	var r models.Review
	err = h.db.QueryRow(ctx,
		`INSERT INTO reviews (id, site_id, product_id, customer_email, display_name, rating, comment)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, site_id, product_id, customer_email, display_name, rating, comment, status, created_at`,
		uuid.New().String(), siteID, productID,
		strings.ToLower(req.CustomerEmail), req.DisplayName, req.Rating, req.Comment,
	).Scan(&r.ID, &r.SiteID, &r.ProductID, &r.CustomerEmail,
		&r.DisplayName, &r.Rating, &r.Comment, &r.Status, &r.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			return c.Status(409).JSON(fiber.Map{"error": "You have already reviewed this product"})
		}
		log.Printf("[reviews] CreateReview insert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to submit review", "details": err.Error()})
	}

	r.CustomerEmail = redactEmail(r.CustomerEmail)
	return c.Status(201).JSON(r)
}

// ============ ADMIN ENDPOINTS ============

// ListReviews returns all reviews for the site — optionally filtered by status
func (h *AdminHandler) ListReviews(c *fiber.Ctx) error {
	ctx := context.Background()
	status := c.Query("status") // optional: published | removed

	query := `
		SELECT r.id, r.site_id, r.product_id, r.customer_email, r.display_name,
		       r.rating, r.comment, r.status, r.created_at,
		       p.name AS product_name, p.slug AS product_slug
		FROM reviews r
		JOIN products p ON r.product_id = p.id
		WHERE r.site_id = $1`

	args := []interface{}{siteIDFromCtx(c, h.siteID)}
	if status != "" {
		query += " AND r.status = $2"
		args = append(args, status)
	}
	query += " ORDER BY r.created_at DESC"

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("[reviews] admin ListReviews query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reviews"})
	}
	defer rows.Close()

	type AdminReview struct {
		models.Review
		ProductName string `json:"product_name"`
		ProductSlug string `json:"product_slug"`
	}

	var reviews []AdminReview
	for rows.Next() {
		var r AdminReview
		if err := rows.Scan(
			&r.ID, &r.SiteID, &r.ProductID, &r.CustomerEmail, &r.DisplayName,
			&r.Rating, &r.Comment, &r.Status, &r.CreatedAt,
			&r.ProductName, &r.ProductSlug,
		); err != nil {
			continue
		}
		reviews = append(reviews, r)
	}

	if reviews == nil {
		reviews = []AdminReview{}
	}

	return c.JSON(fiber.Map{"reviews": reviews, "count": len(reviews)})
}

// RemoveReview soft-deletes a review (sets status to 'removed')
func (h *AdminHandler) RemoveReview(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"UPDATE reviews SET status = 'removed' WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID),
	)
	if err != nil {
		log.Printf("[reviews] RemoveReview exec: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to remove review"})
	}
	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Review not found"})
	}

	return c.Status(204).Send(nil)
}

// redactEmail masks an email address for public display: j***@example.com
func redactEmail(email string) string {
	at := strings.Index(email, "@")
	if at <= 1 {
		return "***@" + email[at+1:]
	}
	return string(email[0]) + "***@" + email[at+1:]
}
