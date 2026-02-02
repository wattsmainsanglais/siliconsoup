-- Add nested subcategories for testing tree structure

-- Subcategories under RFID Readers (b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
INSERT INTO categories (id, site_id, slug, name, description, parent_id, sort_order) VALUES
('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '125khz-readers', '125KHz Readers', 'Low frequency RFID readers', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1),
('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '13mhz-readers', '13.56MHz Readers', 'High frequency NFC/RFID readers', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2);

-- Subcategories under Accessories (b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
INSERT INTO categories (id, site_id, slug, name, description, parent_id, sort_order) VALUES
('b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'antennas', 'Antennas', 'RFID antennas in various sizes', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1),
('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cables', 'Cables & Connectors', 'Connection cables and adapters', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2);
