-- Central image store
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(500) NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(500) DEFAULT '',
  size_bytes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
