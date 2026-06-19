package handlers

import (
	"context"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type AnnouncementHandler struct {
	db     *pgxpool.Pool
	siteID string
}

func NewAnnouncementHandler(db *pgxpool.Pool, siteID string) *AnnouncementHandler {
	return &AnnouncementHandler{db: db, siteID: siteID}
}

// ListAnnouncements returns active announcements for the current site (public)
func (h *AnnouncementHandler) ListAnnouncements(c *fiber.Ctx) error {
	ctx := context.Background()

	rows, err := h.db.Query(ctx,
		`SELECT id, site_id, title, description, image_url, link, active, sort_order, created_at
		 FROM announcements
		 WHERE site_id = $1 AND active = true
		 ORDER BY sort_order ASC, created_at DESC`,
		siteIDFromCtx(c, h.siteID),
	)
	if err != nil {
		log.Printf("[announcements] ListAnnouncements query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch announcements"})
	}
	defer rows.Close()

	var items []models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.SiteID, &a.Title, &a.Description, &a.ImageURL,
			&a.Link, &a.Active, &a.SortOrder, &a.CreatedAt); err != nil {
			continue
		}
		items = append(items, a)
	}
	if items == nil {
		items = []models.Announcement{}
	}
	return c.JSON(fiber.Map{"announcements": items, "count": len(items)})
}

// AdminListAnnouncements returns all announcements (active + inactive) for admin
func (h *AnnouncementHandler) AdminListAnnouncements(c *fiber.Ctx) error {
	ctx := context.Background()

	rows, err := h.db.Query(ctx,
		`SELECT id, site_id, title, description, image_url, link, active, sort_order, created_at
		 FROM announcements
		 WHERE site_id = $1
		 ORDER BY sort_order ASC, created_at DESC`,
		siteIDFromCtx(c, h.siteID),
	)
	if err != nil {
		log.Printf("[announcements] AdminListAnnouncements query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch announcements"})
	}
	defer rows.Close()

	var items []models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.SiteID, &a.Title, &a.Description, &a.ImageURL,
			&a.Link, &a.Active, &a.SortOrder, &a.CreatedAt); err != nil {
			continue
		}
		items = append(items, a)
	}
	if items == nil {
		items = []models.Announcement{}
	}
	return c.JSON(fiber.Map{"announcements": items, "count": len(items)})
}

// CreateAnnouncement creates a new announcement
func (h *AnnouncementHandler) CreateAnnouncement(c *fiber.Ctx) error {
	var req models.CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
	}

	ctx := context.Background()
	var a models.Announcement
	err := h.db.QueryRow(ctx,
		`INSERT INTO announcements (site_id, title, description, image_url, link, active, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, site_id, title, description, image_url, link, active, sort_order, created_at`,
		siteIDFromCtx(c, h.siteID), req.Title, req.Description, req.ImageURL,
		req.Link, req.Active, req.SortOrder,
	).Scan(&a.ID, &a.SiteID, &a.Title, &a.Description, &a.ImageURL,
		&a.Link, &a.Active, &a.SortOrder, &a.CreatedAt)
	if err != nil {
		log.Printf("[announcements] CreateAnnouncement insert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create announcement"})
	}
	return c.Status(201).JSON(a)
}

// UpdateAnnouncement updates an existing announcement
func (h *AnnouncementHandler) UpdateAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
	}

	ctx := context.Background()
	var a models.Announcement
	err := h.db.QueryRow(ctx,
		`UPDATE announcements
		 SET title = $1, description = $2, image_url = $3, link = $4, active = $5, sort_order = $6
		 WHERE id = $7 AND site_id = $8
		 RETURNING id, site_id, title, description, image_url, link, active, sort_order, created_at`,
		req.Title, req.Description, req.ImageURL, req.Link, req.Active, req.SortOrder,
		id, siteIDFromCtx(c, h.siteID),
	).Scan(&a.ID, &a.SiteID, &a.Title, &a.Description, &a.ImageURL,
		&a.Link, &a.Active, &a.SortOrder, &a.CreatedAt)
	if err != nil {
		log.Printf("[announcements] UpdateAnnouncement: %v", err)
		return c.Status(404).JSON(fiber.Map{"error": "Announcement not found"})
	}
	return c.JSON(a)
}

// DeleteAnnouncement deletes an announcement
func (h *AnnouncementHandler) DeleteAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	result, err := h.db.Exec(ctx,
		"DELETE FROM announcements WHERE id = $1 AND site_id = $2",
		id, siteIDFromCtx(c, h.siteID),
	)
	if err != nil {
		log.Printf("[announcements] DeleteAnnouncement: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete announcement"})
	}
	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Announcement not found"})
	}
	return c.SendStatus(204)
}
