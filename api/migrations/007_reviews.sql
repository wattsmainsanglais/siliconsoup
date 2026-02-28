-- Migration 007: Product reviews (verified purchase, auto-published)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One review per email per product
CREATE UNIQUE INDEX idx_reviews_one_per_email ON reviews(product_id, customer_email);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_site_id ON reviews(site_id);
CREATE INDEX idx_reviews_status ON reviews(status);
