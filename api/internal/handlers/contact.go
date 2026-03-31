package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/siliconsoup/api/internal/mailer"
)

type ContactHandler struct {
	mailer *mailer.Mailer
}

func NewContactHandler(m *mailer.Mailer) *ContactHandler {
	return &ContactHandler{mailer: m}
}

type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

func (h *ContactHandler) Send(c *fiber.Ctx) error {
	var req ContactRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Email == "" || req.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name, email and message are required"})
	}
	if !strings.Contains(req.Email, "@") {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid email address"})
	}

	if h.mailer.Enabled() {
		go h.mailer.SendContactNotification(req.Name, req.Email, req.Message)
		go h.mailer.SendContactAutoReply(req.Name, req.Email)
	}

	return c.JSON(fiber.Map{"ok": true})
}
