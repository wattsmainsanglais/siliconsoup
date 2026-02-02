-- Seed data for SiliconSoup

-- Create SiliconSoup site
INSERT INTO sites (id, slug, name, domain, currency, vat_rate, settings) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'siliconsoup', 'SiliconSoup', 'siliconsoup.co.uk', 'GBP', 20.00, '{
    "company_name": "SiliconSoup Ltd",
    "vat_number": "",
    "contact_email": "paul@siliconsoup.co.uk",
    "support_email": "support@siliconsoup.co.uk"
}');

-- Categories
INSERT INTO categories (id, site_id, slug, name, description, sort_order) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'rfid-readers', 'RFID Readers', 'RFID readers for Raspberry Pi and Arduino', 1),
('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'development-boards', 'Development Boards', 'Prototyping and development boards', 2),
('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'accessories', 'Accessories', 'Antennas, cables, and other accessories', 3);

-- Option Groups
INSERT INTO option_groups (id, site_id, name, type, required) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Configuration', 'select', true),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Antenna Size', 'select', false);

-- Option Values for Configuration
INSERT INTO option_values (id, option_group_id, value, label, price_modifier_pence, sort_order, is_default) VALUES
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'reader_only', 'Reader Only', 0, 1, true),
('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'with_antenna', 'With 65mm Antenna', 600, 2, false),
('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'full_kit', 'Full Kit (Reader + Antenna + Tags)', 865, 3, false);

-- Option Values for Antenna Size
INSERT INTO option_values (id, option_group_id, value, label, price_modifier_pence, sort_order, is_default) VALUES
('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '30mm', '30mm Compact', 0, 1, false),
('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '65mm', '65mm Standard', 0, 2, true),
('d6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '120mm', '120mm Long Range', 500, 3, false);

-- Products
INSERT INTO products (id, site_id, category_id, slug, name, description, short_description, base_price_pence, sku, weight_grams, status, featured, images) VALUES
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'rfid-reader-125khz',
 'RFID Reader (125KHz) for Raspberry Pi',
 'High-quality 125KHz RFID reader module designed for Raspberry Pi. Supports EM4100 and compatible cards/tags. Perfect for access control, attendance systems, and hobby projects.

Features:
- Read range: up to 80mm with standard antenna
- Compatible with all Raspberry Pi models
- Simple UART interface
- 3.3V and 5V compatible
- Includes Python library and examples',
 'Easy-to-use 125KHz RFID reader for Raspberry Pi projects',
 3350, 'SS-RFID-125', 45, 'active', true,
 '[{"url": "/images/rfid-125-1.jpg", "alt": "RFID Reader 125KHz", "sort_order": 1}]'),

('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'rfid-reader-13mhz',
 'RFID Reader (13.56MHz) for Raspberry Pi',
 'Professional 13.56MHz RFID/NFC reader supporting MIFARE and NTAG chips. Ideal for more secure applications requiring read/write capabilities.

Features:
- Supports MIFARE Classic, Ultralight, NTAG21x
- Read and write capability
- SPI interface for fast communication
- Crypto1 authentication support
- Compatible with all Raspberry Pi models',
 'Full-featured 13.56MHz NFC reader with read/write support',
 4500, 'SS-RFID-13M', 35, 'active', true,
 '[{"url": "/images/rfid-13m-1.jpg", "alt": "RFID Reader 13.56MHz", "sort_order": 1}]'),

('e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'rfid-antenna-65mm',
 '65mm RFID Antenna',
 'Replacement/spare 65mm antenna for 125KHz RFID readers. Standard size suitable for most applications.',
 'Standard 65mm antenna for 125KHz readers',
 600, 'SS-ANT-65', 15, 'active', false,
 '[{"url": "/images/antenna-65-1.jpg", "alt": "65mm RFID Antenna", "sort_order": 1}]');

-- Link products to option groups
INSERT INTO product_options (product_id, option_group_id, sort_order) VALUES
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1),
('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1);

-- Shipping Zones
INSERT INTO shipping_zones (id, site_id, name, countries, base_rate_pence, per_item_rate_pence, free_threshold_pence) VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'UK', '["GB"]', 350, 50, 5000),
('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EU', '["FR", "DE", "ES", "IT", "NL", "BE", "AT", "IE", "PT", "PL"]', 850, 100, 10000),
('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'International', '["US", "CA", "AU", "JP"]', 1500, 200, null);
