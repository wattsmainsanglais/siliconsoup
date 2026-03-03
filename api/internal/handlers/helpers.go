package handlers

import "github.com/gofiber/fiber/v2"

// siteIDFromCtx returns the site ID injected by SiteMiddleware when the
// X-Site-ID header was sent, falling back to the handler's startup siteID.
func siteIDFromCtx(c *fiber.Ctx, fallback string) string {
	if id, ok := c.Locals("siteID").(string); ok && id != "" {
		return id
	}
	return fallback
}
