package models

import (
	"encoding/json"
	"time"
)

// Site represents a tenant in the multi-site system
type Site struct {
	ID        string          `json:"id"`
	Slug      string          `json:"slug"`
	Name      string          `json:"name"`
	Domain    *string         `json:"domain,omitempty"`
	Currency  string          `json:"currency"`
	VATRate   float64         `json:"vat_rate"`
	Settings  json.RawMessage `json:"settings,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// Category represents a product category
type Category struct {
	ID          string     `json:"id"`
	SiteID      string     `json:"site_id"`
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	ParentID    *string    `json:"parent_id,omitempty"`
	SortOrder   int        `json:"sort_order"`
	CreatedAt   time.Time  `json:"created_at"`
	Children    []Category `json:"children,omitempty"`
}

// Product represents a product with its options
type Product struct {
	ID               string          `json:"id"`
	SiteID           string          `json:"site_id"`
	CategoryID       *string         `json:"category_id,omitempty"`
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	Description      *string         `json:"description,omitempty"`
	ShortDescription *string         `json:"short_description,omitempty"`
	BasePricePence   int             `json:"base_price_pence"`
	SKU              *string         `json:"sku,omitempty"`
	WeightGrams      *int            `json:"weight_grams,omitempty"`
	Dimensions       json.RawMessage `json:"dimensions,omitempty"`
	Images           json.RawMessage `json:"images"`
	Status           string          `json:"status"`
	Featured         bool            `json:"featured"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`

	// Joined data
	Category     *Category     `json:"category,omitempty"`
	OptionGroups []OptionGroup `json:"option_groups,omitempty"`
}

// ProductListItem is a lighter version for list views
type ProductListItem struct {
	ID               string          `json:"id"`
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	ShortDescription *string         `json:"short_description,omitempty"`
	BasePricePence   int             `json:"base_price_pence"`
	Images           json.RawMessage `json:"images"`
	Status           string          `json:"status"`
	Featured         bool            `json:"featured"`
	CategorySlug     *string         `json:"category_slug,omitempty"`
	CategoryName     *string         `json:"category_name,omitempty"`
	HasOptions       bool            `json:"has_options"`
}

// OptionGroup represents a group of options (e.g., "Configuration")
type OptionGroup struct {
	ID        string        `json:"id"`
	SiteID    string        `json:"site_id"`
	Name      string        `json:"name"`
	Type      string        `json:"type"`
	Required  bool          `json:"required"`
	SortOrder int           `json:"sort_order,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	Values    []OptionValue `json:"values,omitempty"`
}

// OptionValue represents a single option value (e.g., "With Antenna")
type OptionValue struct {
	ID                 string    `json:"id"`
	OptionGroupID      string    `json:"option_group_id"`
	Value              string    `json:"value"`
	Label              string    `json:"label"`
	PriceModifierPence int       `json:"price_modifier_pence"`
	SortOrder          int       `json:"sort_order"`
	IsDefault          bool      `json:"is_default"`
	CreatedAt          time.Time `json:"created_at"`
}

// ShippingZone represents shipping rates for a region
type ShippingZone struct {
	ID                 string          `json:"id"`
	SiteID             string          `json:"site_id"`
	Name               string          `json:"name"`
	Countries          json.RawMessage `json:"countries"`
	BaseRatePence      int             `json:"base_rate_pence"`
	PerItemRatePence   int             `json:"per_item_rate_pence"`
	FreeThresholdPence *int            `json:"free_threshold_pence,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
}

// Order represents a customer order
type Order struct {
	ID              string          `json:"id"`
	SiteID          string          `json:"site_id"`
	OrderNumber     string          `json:"order_number"`
	CustomerEmail   string          `json:"customer_email"`
	CustomerName    string          `json:"customer_name"`
	CustomerPhone   *string         `json:"customer_phone,omitempty"`
	ShippingAddress json.RawMessage `json:"shipping_address"`
	BillingAddress  json.RawMessage `json:"billing_address,omitempty"`
	Items           json.RawMessage `json:"items"`
	SubtotalPence   int             `json:"subtotal_pence"`
	ShippingPence   int             `json:"shipping_pence"`
	VATPence        int             `json:"vat_pence"`
	TotalPence      int             `json:"total_pence"`
	Currency        string          `json:"currency"`
	ShippingZoneID  *string         `json:"shipping_zone_id,omitempty"`
	PaymentStatus   string          `json:"payment_status"`
	PaymentMethod   *string         `json:"payment_method,omitempty"`
	PaymentTxnID    *string         `json:"payment_txn_id,omitempty"`
	Status          string          `json:"status"`
	TrackingNumber  *string         `json:"tracking_number,omitempty"`
	Notes           *string         `json:"notes,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// QuoteRequest represents a custom quote request
type QuoteRequest struct {
	ID               string    `json:"id"`
	SiteID           string    `json:"site_id"`
	ReferenceNumber  string    `json:"reference_number"`
	CustomerName     string    `json:"customer_name"`
	CustomerEmail    string    `json:"customer_email"`
	CompanyName      *string   `json:"company_name,omitempty"`
	ProductInterest  *string   `json:"product_interest,omitempty"`
	Requirements     string    `json:"requirements"`
	Quantity         *int      `json:"quantity,omitempty"`
	BudgetIndication *string   `json:"budget_indication,omitempty"`
	Status           string    `json:"status"`
	QuotedAmountPence *int     `json:"quoted_amount_pence,omitempty"`
	InternalNotes    *string   `json:"internal_notes,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// ProductImage represents an image attached to a product
type ProductImage struct {
	Filename  string `json:"filename"`
	Alt       string `json:"alt"`
	SortOrder int    `json:"sort_order"`
}

// Address for orders
type Address struct {
	Line1    string  `json:"line1"`
	Line2    *string `json:"line2,omitempty"`
	City     string  `json:"city"`
	County   *string `json:"county,omitempty"`
	Postcode string  `json:"postcode"`
	Country  string  `json:"country"`
}

// OrderItem represents a line item in an order
type OrderItem struct {
	ProductID      string            `json:"product_id"`
	Name           string            `json:"name"`
	SKU            *string           `json:"sku,omitempty"`
	Options        map[string]string `json:"options,omitempty"`
	Quantity       int               `json:"quantity"`
	UnitPricePence int               `json:"unit_price_pence"`
}

// CartItem for cart calculations
type CartItem struct {
	ProductID       string            `json:"product_id"`
	Quantity        int               `json:"quantity"`
	SelectedOptions map[string]string `json:"selected_options,omitempty"`
}

// CartCalculation request/response
type CartCalculateRequest struct {
	Items       []CartItem `json:"items"`
	CountryCode string     `json:"country_code"`
}

type CartCalculateResponse struct {
	Items         []CartItemCalculated `json:"items"`
	SubtotalPence int                  `json:"subtotal_pence"`
	ShippingPence int                  `json:"shipping_pence"`
	VATPence      int                  `json:"vat_pence"`
	TotalPence    int                  `json:"total_pence"`
	ShippingZone  *string              `json:"shipping_zone,omitempty"`
	FreeShipping  bool                 `json:"free_shipping"`
}

type CartItemCalculated struct {
	ProductID      string `json:"product_id"`
	Name           string `json:"name"`
	Quantity       int    `json:"quantity"`
	UnitPricePence int    `json:"unit_price_pence"`
	TotalPence     int    `json:"total_pence"`
}

// Admin request types

type CreateCategoryRequest struct {
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	ParentID    *string `json:"parent_id,omitempty"`
	SortOrder   int     `json:"sort_order"`
}

type CreateOptionGroupRequest struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // select, multiselect, text, number
	Required bool   `json:"required"`
}

type CreateOptionValueRequest struct {
	OptionGroupID      string `json:"option_group_id"`
	Value              string `json:"value"`
	Label              string `json:"label"`
	PriceModifierPence int    `json:"price_modifier_pence"`
	SortOrder          int    `json:"sort_order"`
	IsDefault          bool   `json:"is_default"`
}

type CreateProductRequest struct {
	CategoryID       *string        `json:"category_id,omitempty"`
	Slug             string         `json:"slug"`
	Name             string         `json:"name"`
	Description      *string        `json:"description,omitempty"`
	ShortDescription *string        `json:"short_description,omitempty"`
	BasePricePence   int            `json:"base_price_pence"`
	SKU              *string        `json:"sku,omitempty"`
	WeightGrams      *int           `json:"weight_grams,omitempty"`
	Images           []ProductImage `json:"images"`
	Status           string         `json:"status"` // active, draft, archived
	Featured         bool           `json:"featured"`
}

type CreateProductOptionRequest struct {
	ProductID     string `json:"product_id"`
	OptionGroupID string `json:"option_group_id"`
	SortOrder     int    `json:"sort_order"`
}
