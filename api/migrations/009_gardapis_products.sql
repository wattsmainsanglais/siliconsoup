-- Gard'Apis products seed
-- Site was seeded in migration 008 with slug 'gardapis'

-- Category
INSERT INTO categories (site_id, slug, name, description, sort_order)
VALUES (
    (SELECT id FROM sites WHERE slug = 'gardapis'),
    'trap-kits',
    'Trap Kits',
    'Asiatic Hornet trap kits and components',
    1
)
ON CONFLICT (site_id, slug) DO NOTHING;

-- Product 1: Complete Hornet Trap Kit
INSERT INTO products (site_id, category_id, slug, name, description, short_description, base_price_pence, sku, status, featured, images)
VALUES (
    (SELECT id FROM sites WHERE slug = 'gardapis'),
    (SELECT id FROM categories WHERE site_id = (SELECT id FROM sites WHERE slug = 'gardapis') AND slug = 'trap-kits'),
    'complete-hornet-trap-kit',
    'Gard''Apis Sentinel — Complete Hornet Trap Kit',
    'The complete Gard''Apis Sentinel kit — everything you need to set up one fully functional Asiatic Hornet trap straight out of the box.

What''s included:
- Queen Excluder mesh body (half Dadant frame)
- 2 end cones
- 2 pairs of discriminatory nozzles (1 red for spring, 1 orange for summer)
- Mesh clip
- Transparent bait tray
- Instructions

The red nozzle targets queen-sized hornets in spring; the orange nozzle targets workers in summer. Both are designed to minimise bycatch and protect other beneficial insects.',
    'One complete Asiatic Hornet trap — includes mesh body, nozzles, bait tray, and clip. Ready to use.',
    1999,
    'GA-SENTINEL-KIT',
    'active',
    true,
    '[]'
)
ON CONFLICT (site_id, slug) DO NOTHING;

-- Product 2: Double Trap Kit (no grille — requires own queen excluder)
INSERT INTO products (site_id, category_id, slug, name, description, short_description, base_price_pence, sku, status, featured, images)
VALUES (
    (SELECT id FROM sites WHERE slug = 'gardapis'),
    (SELECT id FROM categories WHERE site_id = (SELECT id FROM sites WHERE slug = 'gardapis') AND slug = 'trap-kits'),
    'double-trap-kit',
    'Double Gard''Apis Sentinel Trap Kit',
    'Build two Gard''Apis Sentinel traps using your existing Dadant 10-frame queen excluders. This kit supplies all the components except the mesh body grilles — ideal if you already have Nicot queen excluders.

What''s included:
- 4 end cones
- 4 pairs of discriminatory nozzles (2 red, 2 orange)
- 2 mesh clips
- 2 transparent bait trays
- Instructions

Note: Queen excluder grilles are not included. You will need two Dadant 10-frame (Nicot) queen excluders to complete the traps.',
    'Components for two Sentinel traps — nozzles, clips, and bait trays. Requires your own Dadant queen excluders (not included).',
    2799,
    'GA-DOUBLE-KIT',
    'active',
    true,
    '[]'
)
ON CONFLICT (site_id, slug) DO NOTHING;
