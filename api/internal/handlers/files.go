package handlers

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/siliconsoup/api/internal/models"
)

// ============ PRODUCT FILES HANDLERS ============

// ListProductFiles returns all files attached to a product
func (h *AdminHandler) ListProductFiles(c *fiber.Ctx) error {
	productID := c.Params("id")
	ctx := context.Background()

	rows, err := h.db.Query(ctx,
		`SELECT id, product_id, title, type, url, sort_order, created_at
		 FROM product_files WHERE product_id = $1 ORDER BY sort_order, created_at`,
		productID,
	)
	if err != nil {
		log.Printf("[files] ListProductFiles query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch product files"})
	}
	defer rows.Close()

	var files []models.ProductFile
	for rows.Next() {
		var f models.ProductFile
		if err := rows.Scan(&f.ID, &f.ProductID, &f.Title, &f.Type, &f.URL, &f.SortOrder, &f.CreatedAt); err != nil {
			continue
		}
		files = append(files, f)
	}

	if files == nil {
		files = []models.ProductFile{}
	}

	return c.JSON(fiber.Map{"files": files, "count": len(files)})
}

// CreateProductFile adds a file record to a product (PDF URL or external URL)
func (h *AdminHandler) CreateProductFile(c *fiber.Ctx) error {
	productID := c.Params("id")
	var req models.CreateProductFileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Title == "" || req.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "title and url are required"})
	}
	if req.Type != "pdf" && req.Type != "url" {
		return c.Status(400).JSON(fiber.Map{"error": "type must be 'pdf' or 'url'"})
	}

	ctx := context.Background()
	var f models.ProductFile
	err := h.db.QueryRow(ctx,
		`INSERT INTO product_files (id, product_id, title, type, url, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, product_id, title, type, url, sort_order, created_at`,
		uuid.New().String(), productID, req.Title, req.Type, req.URL, req.SortOrder,
	).Scan(&f.ID, &f.ProductID, &f.Title, &f.Type, &f.URL, &f.SortOrder, &f.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid product_id"})
		}
		log.Printf("[files] CreateProductFile insert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create product file", "details": err.Error()})
	}

	return c.Status(201).JSON(f)
}

// DeleteProductFile removes a file record and, if a PDF, deletes from disk
func (h *AdminHandler) DeleteProductFile(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	var fileType, url string
	err := h.db.QueryRow(ctx,
		"SELECT type, url FROM product_files WHERE id = $1", id,
	).Scan(&fileType, &url)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "File not found"})
	}

	_, err = h.db.Exec(ctx, "DELETE FROM product_files WHERE id = $1", id)
	if err != nil {
		log.Printf("[files] DeleteProductFile exec: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete file record"})
	}

	// If it's a locally stored PDF, remove from disk
	if fileType == "pdf" && strings.HasPrefix(url, "/uploads/") {
		relativePath := strings.TrimPrefix(url, "/uploads/")
		filePath := filepath.Join(h.uploadPath, relativePath)
		os.Remove(filePath)
	}

	return c.Status(204).Send(nil)
}

// UploadFile handles PDF uploads — returns a URL to use when creating a product file record
func (h *AdminHandler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".pdf" {
		return c.Status(400).JSON(fiber.Map{"error": "Only PDF files are accepted"})
	}

	if file.Size > 20*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File too large. Max 20MB"})
	}

	uploadDir := filepath.Join(h.uploadPath, "files")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("[files] UploadFile mkdir: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	filename := fmt.Sprintf("%s-%d%s", uuid.New().String()[:8], time.Now().Unix(), ext)
	destPath := filepath.Join(uploadDir, filename)

	src, err := file.Open()
	if err != nil {
		log.Printf("[files] UploadFile open: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open uploaded file"})
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		log.Printf("[files] UploadFile create: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		log.Printf("[files] UploadFile write: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write file"})
	}

	return c.Status(201).JSON(fiber.Map{
		"filename": filename,
		"url":      fmt.Sprintf("/uploads/files/%s", filename),
	})
}
