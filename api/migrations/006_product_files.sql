-- Migration 006: Product files (PDFs and URLs attached to products)
CREATE TABLE IF NOT EXISTS product_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('pdf', 'url')),
    url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_files_product_id ON product_files(product_id);
