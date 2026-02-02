package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/models"
)

type ShippingHandler struct {
	db     *pgxpool.Pool
	siteID string
}

func NewShippingHandler(db *pgxpool.Pool, siteID string) *ShippingHandler {
	return &ShippingHandler{db: db, siteID: siteID}
}

// ListShippingZones returns all shipping zones for the site
func (h *ShippingHandler) ListShippingZones(c *fiber.Ctx) error {
	ctx := context.Background()

	query := `
		SELECT id, site_id, name, countries, base_rate_pence, per_item_rate_pence, free_threshold_pence, created_at
		FROM shipping_zones
		WHERE site_id = $1
		ORDER BY base_rate_pence
	`

	rows, err := h.db.Query(ctx, query, h.siteID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch shipping zones"})
	}
	defer rows.Close()

	var zones []models.ShippingZone
	for rows.Next() {
		var zone models.ShippingZone
		err := rows.Scan(
			&zone.ID, &zone.SiteID, &zone.Name, &zone.Countries,
			&zone.BaseRatePence, &zone.PerItemRatePence, &zone.FreeThresholdPence, &zone.CreatedAt,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to scan shipping zone"})
		}
		zones = append(zones, zone)
	}

	return c.JSON(fiber.Map{
		"shipping_zones": zones,
		"count":          len(zones),
	})
}
