-- =============================================================================
-- Migration: Multi-Method Delivery + Agencies + WhatsApp Notify
-- =============================================================================
-- Applies new schema for:
--   1. agencies table (carriers operating from Buea)
--   2. agency_town_coverage table (agency ↔ destination town many-to-many)
--   3. delivery_method column on orders
--   4. agency_id column on orders (nullable — only for agency_shipping)
--   5. whatsapp_number column on users
-- =============================================================================

-- 1. Agencies table — transport companies that pick up from Buea
CREATE TABLE IF NOT EXISTS agencies (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  origin_location VARCHAR(255),          -- Buea departure point; NULL if unconfirmed
  contact_phone   VARCHAR(50),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE only for ground-confirmed entries
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agencies_active     ON agencies(is_active);
CREATE INDEX IF NOT EXISTS idx_agencies_verified   ON agencies(is_verified);

-- 2. Agency town coverage — which agencies serve which destination towns
CREATE TABLE IF NOT EXISTS agency_town_coverage (
  id                        SERIAL PRIMARY KEY,
  agency_id                 INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  town_name                 VARCHAR(150) NOT NULL,
  destination_office_location VARCHAR(255),  -- where customer collects at the destination end; NULL if unknown
  is_verified               BOOLEAN NOT NULL DEFAULT FALSE,  -- per coverage row
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (agency_id, town_name)
);

CREATE INDEX IF NOT EXISTS idx_agency_town_agency_id  ON agency_town_coverage(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_town_town_name  ON agency_town_coverage(town_name);
CREATE INDEX IF NOT EXISTS idx_agency_town_verified   ON agency_town_coverage(is_verified);

-- 3. delivery_method on orders (enum-style: local_delivery | agency_shipping | pickup)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50)
  CHECK (delivery_method IN ('local_delivery', 'agency_shipping', 'pickup'));

-- 4. agency_id on orders (only populated for agency_shipping)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_agency_id ON orders(agency_id);

-- 5. whatsapp_number on users (optional, separate from phone in shipping address)
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- =============================================================================
-- SEED DATA — Real Cameroonian bus agencies Buea ↔ Douala / Yaoundé / Bamenda
-- Verification legend:
--   is_verified = TRUE  → "Confirmed" in research notes
--   is_verified = FALSE → "Unconfirmed" or "Partial"
-- origin_location = NULL where address is unconfirmed (don't fabricate addresses)
-- =============================================================================

-- Insert agencies (use ON CONFLICT to stay idempotent)
INSERT INTO agencies (name, origin_location, contact_phone, is_verified, is_active) VALUES
  -- Confirmed agencies
  ('Afrique con Plc',          'Mile 17 Junction, Buea',         '+237 657 675 501',  TRUE,  TRUE),
  ('Vatican Express',           'Mile 17, beside Moghamo, Buea', NULL,                 TRUE,  TRUE),  -- location confirmed; Buea phone unverified
  ('Parklane Travels',          'Mile 18, Buea',                 NULL,                 TRUE,  TRUE),
  ('Nso Boyz Express',          'Main Park, Buea',               NULL,                 TRUE,  TRUE),
  -- Partial (town confirmed, exact Buea address not independently verified)
  ('Musango Bus Services',      NULL,                            NULL,                 FALSE, TRUE),
  ('Amour Mezam Express',       NULL,                            NULL,                 FALSE, TRUE),
  ('Moghamo Travel Agency',     NULL,                            NULL,                 FALSE, TRUE),
  ('Oasis Travels',             NULL,                            NULL,                 FALSE, TRUE),
  ('Epie Rides',                NULL,                            NULL,                 FALSE, TRUE),
  ('Guarantee/Guaranty Express', NULL,                           NULL,                 FALSE, TRUE),
  -- Unconfirmed (appears only in general operator lists)
  ('General Express Voyages',   NULL,                            NULL,                 FALSE, TRUE),
  ('Finexs Voyages Confort',    NULL,                            NULL,                 FALSE, TRUE),
  ('Garanti Express',           NULL,                            NULL,                 FALSE, TRUE),
  ('Le Voyageur VIP',           NULL,                            NULL,                 FALSE, TRUE),
  ('Princess Voyages',          NULL,                            NULL,                 FALSE, TRUE)
ON CONFLICT DO NOTHING;   -- safe re-run; names may not be unique across rows so we use DO NOTHING

-- Agency town coverage for Douala
-- All agencies that cover Buea ↔ Douala
INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
SELECT a.id, 'Douala', dest.office, dest.verified
FROM agencies a
JOIN (VALUES
  ('Afrique con Plc',       'Akwa and Bonaberi, Douala',  TRUE),
  ('Vatican Express',       NULL,                          TRUE),
  ('Musango Bus Services',  NULL,                          FALSE),
  ('Amour Mezam Express',   NULL,                          FALSE),
  ('Moghamo Travel Agency', NULL,                          FALSE),
  ('Oasis Travels',         NULL,                          FALSE),
  ('Epie Rides',            NULL,                          FALSE),
  ('General Express Voyages', NULL,                        FALSE)
) AS dest(name, office, verified) ON a.name = dest.name
ON CONFLICT (agency_id, town_name) DO NOTHING;

-- Agency town coverage for Yaoundé
INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
SELECT a.id, 'Yaounde', dest.office, dest.verified
FROM agencies a
JOIN (VALUES
  ('Afrique con Plc',         NULL,                                      TRUE),
  ('Vatican Express',         NULL,                                      TRUE),
  ('Musango Bus Services',    NULL,                                      FALSE),
  ('Amour Mezam Express',     NULL,                                      FALSE),
  ('Moghamo Travel Agency',   NULL,                                      FALSE),
  ('Oasis Travels',           NULL,                                      FALSE),
  ('Epie Rides',              NULL,                                      FALSE),
  ('Parklane Travels',        'Mvan, beside COGENI, Yaoundé',            TRUE),
  ('Finexs Voyages Confort',  NULL,                                      FALSE)
) AS dest(name, office, verified) ON a.name = dest.name
ON CONFLICT (agency_id, town_name) DO NOTHING;

-- Agency town coverage for Bamenda
INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
SELECT a.id, 'Bamenda', dest.office, dest.verified
FROM agencies a
JOIN (VALUES
  ('Vatican Express',           NULL,                    TRUE),
  ('Amour Mezam Express',       NULL,                    TRUE),   -- direct route confirmed by independent source
  ('Nso Boyz Express',          'City Chemist, Bamenda', TRUE),
  ('Guarantee/Guaranty Express','City Chemist, Bamenda', FALSE),  -- HQ confirmed at City Chemist, Buea leg partial
  ('Garanti Express',           NULL,                    FALSE),
  ('Moghamo Travel Agency',     NULL,                    FALSE),
  ('Le Voyageur VIP',           NULL,                    FALSE),
  ('Princess Voyages',          NULL,                    FALSE)
) AS dest(name, office, verified) ON a.name = dest.name
ON CONFLICT (agency_id, town_name) DO NOTHING;
