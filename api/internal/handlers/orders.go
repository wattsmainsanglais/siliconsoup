package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/siliconsoup/api/internal/mailer"
	"github.com/siliconsoup/api/internal/models"
)

type OrderHandler struct {
	db                 *pgxpool.Pool
	siteID             string
	paypalClientID     string
	paypalClientSecret string
	paypalEnv          string
	mailer             *mailer.Mailer
}

func NewOrderHandler(db *pgxpool.Pool, siteID, paypalClientID, paypalClientSecret, paypalEnv string, m *mailer.Mailer) *OrderHandler {
	return &OrderHandler{
		db:                 db,
		siteID:             siteID,
		paypalClientID:     paypalClientID,
		paypalClientSecret: paypalClientSecret,
		paypalEnv:          paypalEnv,
		mailer:             m,
	}
}

// ============ PAYPAL HELPERS ============

func (h *OrderHandler) paypalBase() string {
	if h.paypalEnv == "live" {
		return "https://api-m.paypal.com"
	}
	return "https://api-m.sandbox.paypal.com"
}

func (h *OrderHandler) paypalAccessToken() (string, error) {
	creds := base64.StdEncoding.EncodeToString([]byte(h.paypalClientID + ":" + h.paypalClientSecret))

	req, err := http.NewRequest("POST", h.paypalBase()+"/v1/oauth2/token", strings.NewReader("grant_type=client_credentials"))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Basic "+creds)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("paypal auth failed: %d", resp.StatusCode)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.AccessToken, nil
}

// ============ PUBLIC ENDPOINTS ============

type CreatePayPalOrderRequest struct {
	TotalPence   int    `json:"total_pence"`
	CurrencyCode string `json:"currency_code"`
}

// CreatePayPalOrder creates a PayPal order and returns the orderID for the frontend
func (h *OrderHandler) CreatePayPalOrder(c *fiber.Ctx) error {
	var req CreatePayPalOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.TotalPence <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid order total"})
	}

	currency := req.CurrencyCode
	if currency == "" {
		currency = "GBP"
	}

	token, err := h.paypalAccessToken()
	if err != nil {
		log.Printf("[orders] CreatePayPalOrder get token: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to authenticate with PayPal"})
	}

	amount := fmt.Sprintf("%.2f", float64(req.TotalPence)/100)
	body := map[string]interface{}{
		"intent": "CAPTURE",
		"purchase_units": []map[string]interface{}{
			{
				"amount": map[string]string{
					"currency_code": currency,
					"value":         amount,
				},
				"description": "SiliconSoup order",
			},
		},
	}

	bodyBytes, _ := json.Marshal(body)
	ppReq, _ := http.NewRequest("POST", h.paypalBase()+"/v2/checkout/orders", bytes.NewReader(bodyBytes))
	ppReq.Header.Set("Authorization", "Bearer "+token)
	ppReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(ppReq)
	if err != nil {
		log.Printf("[orders] CreatePayPalOrder call: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create PayPal order"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[orders] CreatePayPalOrder PayPal error: %s", string(body))
		return c.Status(500).JSON(fiber.Map{"error": "PayPal order creation failed"})
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse PayPal response"})
	}

	return c.JSON(fiber.Map{"id": result.ID})
}

type CapturePayPalOrderRequest struct {
	OrderID         string          `json:"order_id"`
	CustomerName    string          `json:"customer_name"`
	CustomerEmail   string          `json:"customer_email"`
	CustomerPhone   string          `json:"customer_phone"`
	ShippingAddress json.RawMessage `json:"shipping_address"`
	Items           json.RawMessage `json:"items"`
	SubtotalPence   int             `json:"subtotal_pence"`
	ShippingPence   int             `json:"shipping_pence"`
	VATPence        int             `json:"vat_pence"`
	TotalPence      int             `json:"total_pence"`
	Currency        string          `json:"currency"`
}

// CapturePayPalOrder captures payment, saves order to DB, sends notification email
func (h *OrderHandler) CapturePayPalOrder(c *fiber.Ctx) error {
	var req CapturePayPalOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.OrderID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "order_id is required"})
	}

	token, err := h.paypalAccessToken()
	if err != nil {
		log.Printf("[orders] CapturePayPalOrder get token: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to authenticate with PayPal"})
	}

	ppReq, _ := http.NewRequest("POST", h.paypalBase()+"/v2/checkout/orders/"+req.OrderID+"/capture", nil)
	ppReq.Header.Set("Authorization", "Bearer "+token)
	ppReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(ppReq)
	if err != nil {
		log.Printf("[orders] CapturePayPalOrder call: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to capture PayPal payment"})
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 201 {
		log.Printf("[orders] CapturePayPalOrder PayPal error: %s", string(respBody))
		return c.Status(500).JSON(fiber.Map{"error": "PayPal capture failed"})
	}

	var capture struct {
		Status        string `json:"status"`
		PurchaseUnits []struct {
			Payments struct {
				Captures []struct {
					ID     string `json:"id"`
					Amount struct {
						Value        string `json:"value"`
						CurrencyCode string `json:"currency_code"`
					} `json:"amount"`
				} `json:"captures"`
			} `json:"payments"`
		} `json:"purchase_units"`
	}
	if err := json.Unmarshal(respBody, &capture); err != nil {
		log.Printf("[orders] CapturePayPalOrder parse: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse PayPal capture"})
	}

	captureID := ""
	if len(capture.PurchaseUnits) > 0 && len(capture.PurchaseUnits[0].Payments.Captures) > 0 {
		captureID = capture.PurchaseUnits[0].Payments.Captures[0].ID
	}

	// Generate order number: SS-YYYYMMDD-XXXX
	orderNumber := fmt.Sprintf("SS-%s-%s", time.Now().Format("20060102"), strings.ToUpper(uuid.New().String()[:4]))

	currency := req.Currency
	if currency == "" {
		currency = "GBP"
	}

	paymentMethod := "paypal"
	// Ensure items/shipping are valid JSON
	items := req.Items
	if items == nil {
		items = json.RawMessage("[]")
	}
	shippingAddress := req.ShippingAddress
	if shippingAddress == nil {
		shippingAddress = json.RawMessage("{}")
	}

	siteID := siteIDFromCtx(c, h.siteID)

	var phone *string
	if req.CustomerPhone != "" {
		phone = &req.CustomerPhone
	}

	var order models.Order
	err = h.db.QueryRow(context.Background(),
		`INSERT INTO orders (
			id, site_id, order_number,
			customer_email, customer_name, customer_phone,
			shipping_address,
			items,
			subtotal_pence, shipping_pence, vat_pence, total_pence,
			currency,
			payment_status, payment_method, payment_txn_id,
			status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
			'paid', $14, $15, 'pending'
		)
		RETURNING id, site_id, order_number, customer_email, customer_name,
		          subtotal_pence, shipping_pence, vat_pence, total_pence,
		          currency, payment_status, status, created_at`,
		uuid.New().String(), siteID, orderNumber,
		strings.ToLower(req.CustomerEmail), req.CustomerName, phone,
		shippingAddress,
		items,
		req.SubtotalPence, req.ShippingPence, req.VATPence, req.TotalPence,
		currency,
		paymentMethod, captureID,
	).Scan(
		&order.ID, &order.SiteID, &order.OrderNumber, &order.CustomerEmail, &order.CustomerName,
		&order.SubtotalPence, &order.ShippingPence, &order.VATPence, &order.TotalPence,
		&order.Currency, &order.PaymentStatus, &order.Status, &order.CreatedAt,
	)
	if err != nil {
		log.Printf("[orders] CapturePayPalOrder insert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save order"})
	}

	// Send notification email (non-blocking)
	if h.mailer.Enabled() {
		go h.mailer.SendOrderNotification(order, req.CustomerName, req.CustomerEmail, captureID)
	}

	return c.JSON(fiber.Map{
		"capture_id":   captureID,
		"order_number": orderNumber,
		"order_id":     order.ID,
		"status":       capture.Status,
	})
}

// ============ ADMIN ENDPOINTS ============

// ListOrders returns all orders for the site, newest first
func (h *OrderHandler) ListOrders(c *fiber.Ctx) error {
	ctx := context.Background()
	status := c.Query("status") // optional filter

	query := `
		SELECT id, site_id, order_number, customer_email, customer_name,
		       subtotal_pence, shipping_pence, vat_pence, total_pence,
		       currency, payment_status, payment_method, payment_txn_id,
		       status, tracking_number, notes, created_at, updated_at
		FROM orders
		WHERE site_id = $1`

	args := []interface{}{siteIDFromCtx(c, h.siteID)}
	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("[orders] ListOrders query: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch orders"})
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(
			&o.ID, &o.SiteID, &o.OrderNumber, &o.CustomerEmail, &o.CustomerName,
			&o.SubtotalPence, &o.ShippingPence, &o.VATPence, &o.TotalPence,
			&o.Currency, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentTxnID,
			&o.Status, &o.TrackingNumber, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			log.Printf("[orders] ListOrders scan: %v", err)
			continue
		}
		orders = append(orders, o)
	}

	if orders == nil {
		orders = []models.Order{}
	}

	return c.JSON(fiber.Map{"orders": orders, "count": len(orders)})
}

// GetOrder returns a single order with full detail including items and shipping address
func (h *OrderHandler) GetOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := context.Background()

	var o models.Order
	err := h.db.QueryRow(ctx,
		`SELECT id, site_id, order_number, customer_email, customer_name, customer_phone,
		        shipping_address, items,
		        subtotal_pence, shipping_pence, vat_pence, total_pence,
		        currency, payment_status, payment_method, payment_txn_id,
		        status, tracking_number, notes, created_at, updated_at
		 FROM orders WHERE id = $1 AND site_id = $2`,
		id, siteIDFromCtx(c, h.siteID),
	).Scan(
		&o.ID, &o.SiteID, &o.OrderNumber, &o.CustomerEmail, &o.CustomerName, &o.CustomerPhone,
		&o.ShippingAddress, &o.Items,
		&o.SubtotalPence, &o.ShippingPence, &o.VATPence, &o.TotalPence,
		&o.Currency, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentTxnID,
		&o.Status, &o.TrackingNumber, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
	}

	return c.JSON(o)
}

type UpdateOrderRequest struct {
	Status         *string `json:"status"` // pending | processing | shipped | delivered | cancelled
	TrackingNumber *string `json:"tracking_number"`
	Notes          *string `json:"notes"`
}

// RecordOrder saves a pre-captured PayPal order to the database.
// Used by external Next.js storefronts (e.g. Gardapis) that handle PayPal
// capture themselves and just need the order persisted here.
// Protected by AdminAuth. Send X-Site-ID header to target the correct site.
type RecordOrderRequest struct {
	CaptureID       string          `json:"capture_id"`
	CustomerName    string          `json:"customer_name"`
	CustomerEmail   string          `json:"customer_email"`
	CustomerPhone   string          `json:"customer_phone"`
	ShippingAddress json.RawMessage `json:"shipping_address"`
	Items           json.RawMessage `json:"items"`
	SubtotalPence   int             `json:"subtotal_pence"`
	ShippingPence   int             `json:"shipping_pence"`
	TotalPence      int             `json:"total_pence"`
	Currency        string          `json:"currency"`
}

func (h *OrderHandler) RecordOrder(c *fiber.Ctx) error {
	var req RecordOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.CaptureID == "" || req.CustomerEmail == "" {
		return c.Status(400).JSON(fiber.Map{"error": "capture_id and customer_email are required"})
	}

	orderNumber := fmt.Sprintf("ORD-%s-%s", time.Now().Format("20060102"), strings.ToUpper(uuid.New().String()[:4]))

	currency := req.Currency
	if currency == "" {
		currency = "EUR"
	}
	items := req.Items
	if items == nil {
		items = json.RawMessage("[]")
	}
	shippingAddress := req.ShippingAddress
	if shippingAddress == nil {
		shippingAddress = json.RawMessage("{}")
	}

	var phone *string
	if req.CustomerPhone != "" {
		phone = &req.CustomerPhone
	}

	siteID := siteIDFromCtx(c, h.siteID)

	var order models.Order
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO orders (
			id, site_id, order_number,
			customer_email, customer_name, customer_phone,
			shipping_address, items,
			subtotal_pence, shipping_pence, vat_pence, total_pence,
			currency,
			payment_status, payment_method, payment_txn_id,
			status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12,
			'paid', 'paypal', $13, 'pending'
		)
		RETURNING id, site_id, order_number, customer_email, customer_name,
		          subtotal_pence, shipping_pence, vat_pence, total_pence,
		          currency, payment_status, status, created_at`,
		uuid.New().String(), siteID, orderNumber,
		strings.ToLower(req.CustomerEmail), req.CustomerName, phone,
		shippingAddress, items,
		req.SubtotalPence, req.ShippingPence, req.TotalPence,
		currency, req.CaptureID,
	).Scan(
		&order.ID, &order.SiteID, &order.OrderNumber, &order.CustomerEmail, &order.CustomerName,
		&order.SubtotalPence, &order.ShippingPence, &order.VATPence, &order.TotalPence,
		&order.Currency, &order.PaymentStatus, &order.Status, &order.CreatedAt,
	)
	if err != nil {
		log.Printf("[orders] RecordOrder insert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save order"})
	}

	return c.JSON(fiber.Map{
		"order_number": orderNumber,
		"order_id":     order.ID,
	})
}

// UpdateOrder updates status, tracking number, or notes on an order
func (h *OrderHandler) UpdateOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx := context.Background()

	// Fetch current status before update so we can detect changes
	var prevStatus string
	err := h.db.QueryRow(ctx,
		`SELECT status FROM orders WHERE id = $1 AND site_id = $2`,
		id, siteIDFromCtx(c, h.siteID),
	).Scan(&prevStatus)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
	}

	result, err := h.db.Exec(ctx,
		`UPDATE orders SET
			status = COALESCE($1, status),
			tracking_number = COALESCE($2, tracking_number),
			notes = COALESCE($3, notes),
			updated_at = NOW()
		 WHERE id = $4 AND site_id = $5`,
		req.Status, req.TrackingNumber, req.Notes,
		id, siteIDFromCtx(c, h.siteID),
	)
	if err != nil {
		log.Printf("[orders] UpdateOrder exec: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update order"})
	}
	if result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
	}

	// Re-fetch updated order
	var updated models.Order
	err = h.db.QueryRow(ctx,
		`SELECT id, site_id, order_number, customer_email, customer_name, customer_phone,
		        shipping_address, items,
		        subtotal_pence, shipping_pence, vat_pence, total_pence,
		        currency, payment_status, payment_method, payment_txn_id,
		        status, tracking_number, notes, created_at, updated_at
		 FROM orders WHERE id = $1 AND site_id = $2`,
		id, siteIDFromCtx(c, h.siteID),
	).Scan(
		&updated.ID, &updated.SiteID, &updated.OrderNumber, &updated.CustomerEmail, &updated.CustomerName, &updated.CustomerPhone,
		&updated.ShippingAddress, &updated.Items,
		&updated.SubtotalPence, &updated.ShippingPence, &updated.VATPence, &updated.TotalPence,
		&updated.Currency, &updated.PaymentStatus, &updated.PaymentMethod, &updated.PaymentTxnID,
		&updated.Status, &updated.TrackingNumber, &updated.Notes, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		log.Printf("[orders] UpdateOrder re-fetch: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated order"})
	}

	// Fire status email if status changed to shipped or delivered
	if h.mailer.Enabled() && req.Status != nil && *req.Status != prevStatus {
		if updated.Status == "shipped" || updated.Status == "delivered" {
			go h.mailer.SendStatusUpdate(updated)
		}
	}

	return c.JSON(updated)
}

