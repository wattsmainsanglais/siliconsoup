-- Migration 004: Add image column to option_values
ALTER TABLE option_values ADD COLUMN IF NOT EXISTS image VARCHAR(500);
