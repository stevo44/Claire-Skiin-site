-- Phase 4b: Coupons Migration
-- All idempotent: safe to re-run on existing databases.

-- 1. Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id                 SERIAL PRIMARY KEY,
  code               VARCHAR(50) UNIQUE NOT NULL,
  -- Codes are stored UPPERCASED at insert time (enforced in service layer).
  -- All lookups do UPPER($1) for case-insensitive matching.
  discount_type      VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value     NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_amount   NUMERIC(10, 2) DEFAULT NULL,
  max_uses           INTEGER DEFAULT NULL,
  max_uses_per_user  INTEGER DEFAULT NULL,
  starts_at          TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at         TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code     ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active   ON coupons(is_active);

-- 2. Coupon redemptions table
--    user_id nullable: current checkout requires auth but keeping nullable
--    as a belt-and-suspenders guard against future guest orders.
--    order_id nullable to allow pre-recording during order creation before payment;
--    however in practice we only insert AFTER payment is confirmed (see service).
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id               SERIAL PRIMARY KEY,
  coupon_id        INTEGER NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id         INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id   ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order_id  ON coupon_redemptions(order_id);

-- 3. Column to link a coupon to an order at creation time (needed to bridge validation → payment)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id       INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

-- 4. coupons:manage permission (admin + manager)
INSERT INTO permissions (key, description)
VALUES ('coupons:manage', 'Ability to create, update, and deactivate coupon codes')
ON CONFLICT (key) DO NOTHING;

-- Assign to admin (all permissions already covered by CROSS JOIN in initDb.ts, adding explicitly)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'manager')
  AND p.key = 'coupons:manage'
ON CONFLICT DO NOTHING;

-- 5. Seed the legacy GLOW15 coupon so existing references still work
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active)
VALUES ('GLOW15', 'percentage', 15, NULL, NULL, TRUE)
ON CONFLICT (code) DO NOTHING;
