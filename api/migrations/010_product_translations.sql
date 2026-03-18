-- Migration 010: Add translations JSONB column to products
-- Stores translated short_description and description per locale (names are not translated)
-- Structure: {"fr": {"short_description": "...", "description": "..."}, "de": {...}, ...}
-- Seeded with English content on product create; overwritten with real translations via POST /admin/products/:id/translate

ALTER TABLE products ADD COLUMN IF NOT EXISTS translations JSONB;
