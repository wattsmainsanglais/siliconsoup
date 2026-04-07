-- Add site_id to images table so each image belongs to a specific site.
-- Nullable FK — existing rows get NULL, then immediately assigned to SiliconSoup below.
ALTER TABLE images ADD COLUMN site_id UUID REFERENCES sites(id);

-- Assign all existing images to SiliconSoup (safe default — see PROGRESS.md for
-- manual UPDATE commands to reassign any Gardapis images after deploy).
UPDATE images SET site_id = (SELECT id FROM sites WHERE slug = 'siliconsoup') WHERE site_id IS NULL;
