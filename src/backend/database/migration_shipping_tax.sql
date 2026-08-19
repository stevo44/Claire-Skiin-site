-- =============================================================================
-- Migration: Checkout Completeness — Shipping Rates & Tax/Settings Config
-- =============================================================================
-- NOTE: This file mirrors the DDL/seed statements that already exist (but were
-- never executed) inside src/backend/config/initDb.ts. initDb.ts is what
-- actually runs at server boot — this file is kept for manual/reference
-- application and to match the existing migration_*.sql convention used by
-- migration_coupons.sql, migration_reviews.sql, etc.
-- =============================================================================

-- 1. Generic key/value settings table (tax rate, free shipping threshold, ...)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value, description) VALUES
  ('tax_rate', '{"rate": 19.25, "description": "Cameroon standard VAT rate as percentage"}', 'Tax rate percentage applied to subtotal'),
  ('free_shipping_threshold', '{"amount": 50000, "enabled": false}', 'Order subtotal above which shipping is free (in XAF)')
ON CONFLICT (key) DO NOTHING;

-- 2. Shipping rates by region/city band (admin-configurable, MVP flat-rate model)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id SERIAL PRIMARY KEY,
  region_name VARCHAR(100) NOT NULL UNIQUE,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_region ON shipping_rates(region_name);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_active ON shipping_rates(is_active);

-- NOTE: region_name values are intentionally unaccented (Yaounde, not
-- Yaoundé; Ngaoundere, not Ngaoundéré) to match the normalization output of
-- ShippingService.getShippingCost() in shipping.service.ts. Seeding accented
-- names here caused a silent lookup miss that fell through to the 'Other'
-- rate for every Yaoundé/Ngaoundéré address — keep these in sync if either
-- side changes.
INSERT INTO shipping_rates (region_name, rate, is_active) VALUES
  ('Douala', 2500, TRUE),
  ('Yaounde', 2500, TRUE),
  ('Bafoussam', 3000, TRUE),
  ('Garoua', 3500, TRUE),
  ('Maroua', 3500, TRUE),
  ('Ngaoundere', 3500, TRUE),
  ('Bamenda', 3000, TRUE),
  ('Bertoua', 3500, TRUE),
  ('Ebolowa', 3500, TRUE),
  ('Kribi', 3000, TRUE),
  ('Limbe', 3000, TRUE),
  ('Other', 4000, TRUE)
ON CONFLICT (region_name) DO NOTHING;

-- 3. Permission for managing checkout financial settings.
--    Deliberately reused at 'products:delete' tier (manager/admin only) rather
--    than 'inventory:update' (which staff also holds) — tax rate and shipping
--    pricing are financial/business-policy decisions, not day-to-day inventory
--    operations, so staff should not be able to change them.
INSERT INTO permissions (key, description)
VALUES ('products:delete', 'Ability to delete products')
ON CONFLICT (key) DO NOTHING;
