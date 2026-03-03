INSERT INTO sites (id, slug, name, domain, currency, vat_rate)
VALUES (gen_random_uuid(), 'gardapis', 'Gard''Apis', 'gardapis.eu', 'EUR', 20.00)
ON CONFLICT (slug) DO NOTHING;
