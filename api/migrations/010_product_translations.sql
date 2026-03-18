-- Migration 010: Add translations JSONB column to products
-- Stores auto-translated name, short_description, description per locale
-- Structure: {"fr": {"name": "...", "short_description": "...", "description": "..."}, "de": {...}, ...}
-- NULL until a create/update fires the MyMemory translation goroutine

ALTER TABLE products ADD COLUMN IF NOT EXISTS translations JSONB;
