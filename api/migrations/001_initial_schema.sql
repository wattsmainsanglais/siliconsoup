-- SiliconSoup E-commerce Schema
-- All prices stored in pence (£42.15 = 4215)

-- Sites (multi-tenant support)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'GBP',
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, slug)
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    slug VARCHAR(200) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    short_description TEXT,
    base_price_pence INT NOT NULL,
    sku VARCHAR(50),
    weight_grams INT,
    dimensions JSONB,
    images JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, slug)
);

-- Option Groups (the flexibility layer)
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'select',
    required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option Values
CREATE TABLE option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID REFERENCES option_groups(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    price_modifier_pence INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Options (links products to available options)
CREATE TABLE product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    option_group_id UUID REFERENCES option_groups(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    UNIQUE(product_id, option_group_id)
);

-- Shipping Zones
CREATE TABLE shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    countries JSONB NOT NULL,
    base_rate_pence INT NOT NULL,
    per_item_rate_pence INT DEFAULT 0,
    free_threshold_pence INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    order_number VARCHAR(20) NOT NULL,

    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(50),

    shipping_address JSONB NOT NULL,
    billing_address JSONB,

    items JSONB NOT NULL,

    subtotal_pence INT NOT NULL,
    shipping_pence INT NOT NULL,
    vat_pence INT NOT NULL,
    total_pence INT NOT NULL,

    currency VARCHAR(3) DEFAULT 'GBP',
    shipping_zone_id UUID REFERENCES shipping_zones(id) ON DELETE SET NULL,

    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    payment_txn_id VARCHAR(100),

    status VARCHAR(20) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Requests (custom work)
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    reference_number VARCHAR(20) NOT NULL,

    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(200),

    product_interest UUID REFERENCES products(id) ON DELETE SET NULL,
    requirements TEXT NOT NULL,
    quantity INT,
    budget_indication VARCHAR(100),

    status VARCHAR(20) DEFAULT 'new',
    quoted_amount_pence INT,
    internal_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_site_id ON products(site_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = TRUE;

CREATE INDEX idx_categories_site_id ON categories(site_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE INDEX idx_option_values_option_group_id ON option_values(option_group_id);
CREATE INDEX idx_product_options_product_id ON product_options(product_id);

CREATE INDEX idx_orders_site_id ON orders(site_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE INDEX idx_quote_requests_site_id ON quote_requests(site_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
