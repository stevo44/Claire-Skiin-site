import pool from './db.ts';

export const initDatabase = async () => {
  const createRolesTable = `
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedRoles = `
    INSERT INTO roles (name, description) VALUES
    ('admin', 'Super Administrator with full portal control.'),
    ('manager', 'Manager with access to system operations and reporting.'),
    ('staff', 'Staff members assisting with orders, appointments, and inventory.'),
    ('customer', 'Default customer role for shopping and ordering.')
    ON CONFLICT (name) DO NOTHING;
  `;

  const createPermissionsTable = `
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedPermissions = `
    INSERT INTO permissions (key, description) VALUES
    ('orders:view', 'Ability to view orders'),
    ('orders:update_status', 'Ability to update order status'),
    ('appointments:view', 'Ability to view appointments'),
    ('appointments:update_status', 'Ability to update appointments'),
    ('inventory:update', 'Ability to update product/inventory stock'),
    ('analytics:view', 'Ability to view financial reports and analytics'),
    ('products:delete', 'Ability to delete products'),
    ('users:manage', 'Ability to manage users and roles'),
    ('payments:refund', 'Ability to process and record payment refunds'),
    ('notifications:view', 'Ability to view notifications')
    ON CONFLICT (key) DO NOTHING;
  `;

  const createRolePermissionsTable = `
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  `;

  const seedRolePermissions = `
    -- Admin permissions (all)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING;

    -- Staff permissions: orders:view, orders:update_status, appointments:view, appointments:update_status, inventory:update, notifications:view
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'staff'
      AND p.key IN ('orders:view', 'orders:update_status', 'appointments:view', 'appointments:update_status', 'inventory:update', 'notifications:view')
    ON CONFLICT DO NOTHING;

    -- Manager permissions: custom subset (everything except users:manage)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'manager'
      AND p.key IN ('orders:view', 'orders:update_status', 'appointments:view', 'appointments:update_status', 'inventory:update', 'analytics:view', 'products:delete', 'payments:refund', 'notifications:view')
    ON CONFLICT DO NOTHING;
  `;

  const createPaymentsTable = `
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL DEFAULT 'fapshi',
      provider_reference VARCHAR(255) UNIQUE NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      method VARCHAR(50),
      raw_response JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider_reference);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  `;

  const alterOrdersTableForPayments = `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address JSONB;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      avatar_url VARCHAR(255),
      role_id INTEGER REFERENCES roles(id),
      email_verified_at TIMESTAMP WITH TIME ZONE NULL,
      email_verification_token VARCHAR(255) NULL,
      email_verification_expires_at TIMESTAMP WITH TIME ZONE NULL,
      password_reset_token VARCHAR(255) NULL,
      password_reset_expires_at TIMESTAMP WITH TIME ZONE NULL,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterUsersTable = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL;
  `;

  const migrateUserRoles = `
    DO $$
    DECLARE
      role_col_exists BOOLEAN;
    BEGIN
      SELECT COUNT(*) > 0
        INTO role_col_exists
        FROM pg_attribute
       WHERE attrelid = 'users'::regclass
         AND attname  = 'role'
         AND attnum   > 0
         AND NOT attisdropped;

      IF role_col_exists THEN
        EXECUTE $q$
          UPDATE users
          SET role_id = (SELECT id FROM roles WHERE name = 'admin')
          WHERE role_id IS NULL AND role = 'admin'
        $q$;
        EXECUTE $q$
          UPDATE users
          SET role_id = (SELECT id FROM roles WHERE name = 'customer')
          WHERE role_id IS NULL AND (role = 'user' OR role = 'customer' OR role IS NULL)
        $q$;
        EXECUTE $q$
          UPDATE users
          SET role_id = (SELECT id FROM roles WHERE name = 'staff')
          WHERE role_id IS NULL AND role = 'staff'
        $q$;
        EXECUTE $q$
          UPDATE users
          SET role_id = (SELECT id FROM roles WHERE name = 'manager')
          WHERE role_id IS NULL AND role = 'manager'
        $q$;
      END IF;
    END
    $$;
  `;

  const dropUserRoleColumn = `
    DO $$
    DECLARE
      role_col_exists BOOLEAN;
    BEGIN
      SELECT COUNT(*) > 0
        INTO role_col_exists
        FROM pg_attribute
       WHERE attrelid = 'users'::regclass
         AND attname  = 'role'
         AND attnum   > 0
         AND NOT attisdropped;

      IF role_col_exists THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN role';
      END IF;
    END
    $$;
  `;

  const createRefreshTokensTable = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      user_agent VARCHAR(500),
      ip VARCHAR(100)
    );
  `;

  const bootstrapAdmin = `
    UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE email = 'stephenngulle@gmail.com' OR id = 1;
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      stock_quantity INTEGER DEFAULT 0,
      image_url VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const addMetadataColumn = `
    ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  `;

  const createProductsIndexes = `
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
    CREATE INDEX IF NOT EXISTS idx_products_metadata ON products USING gin(metadata);
  `;

  const createCartItemsTable = `
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );
  `;

  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      total_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      price_at_purchase DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `;

  const createEventsTable = `
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      session_id VARCHAR(255),
      event_type VARCHAR(50) NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const addSessionIdColumn = `
    ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
  `;

  const createEventsIndexes = `
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING gin(metadata);
    -- Composite index: every analytics query filters by event_type + created_at
    CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at);
  `;

  const createExtraIndexes = `
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
  `;

  const createWishlistsTable = `
    CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_product_wishlist UNIQUE (user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
    CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
  `;

  // --- Notifications Schema ---
  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      link VARCHAR(500),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      email_status VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Idempotent for databases where the table already existed before
    -- email_status was added (CREATE TABLE IF NOT EXISTS above only
    -- applies to fresh installs, not existing tables).
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_status VARCHAR(20);

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  `;

  // --- Phase 4c Reviews Schema ---
  const createReviewsSchema = `
    CREATE TABLE IF NOT EXISTS reviews (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      order_id            INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title               VARCHAR(150),
      body                TEXT NOT NULL,
      is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
      created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id    ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status     ON reviews(status);

    CREATE TABLE IF NOT EXISTS review_images (
      id         SERIAL PRIMARY KEY,
      review_id  INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      image_url  VARCHAR(500) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

    CREATE TABLE IF NOT EXISTS review_reports (
      id               SERIAL PRIMARY KEY,
      review_id        INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason           TEXT NOT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'reviewed', 'dismissed')),
      created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_review_report UNIQUE (review_id, reporter_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_reports_status    ON review_reports(status);
  `;

  const seedReviewsPermission = `
    INSERT INTO permissions (key, description)
    VALUES ('reviews:moderate', 'Ability to approve, reject, and hide product reviews')
    ON CONFLICT (key) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name IN ('admin', 'manager')
      AND p.key = 'reviews:moderate'
    ON CONFLICT DO NOTHING;
  `;

  // --- Phase 4b Coupons Schema ---
  const createCouponsTable = `
    CREATE TABLE IF NOT EXISTS coupons (
      id                 SERIAL PRIMARY KEY,
      code               VARCHAR(50) UNIQUE NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons(code);
    CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
  `;

  const createCouponRedemptionsTable = `
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
  `;

  const alterOrdersForCoupons = `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id       INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
  `;

  const seedCouponsPermission = `
    INSERT INTO permissions (key, description)
    VALUES ('coupons:manage', 'Ability to create, update, and deactivate coupon codes')
    ON CONFLICT (key) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name IN ('admin', 'manager')
      AND p.key = 'coupons:manage'
    ON CONFLICT DO NOTHING;
  `;

  const seedGlow15Coupon = `
    INSERT INTO coupons (code, discount_type, discount_value, is_active)
    VALUES ('GLOW15', 'percentage', 15, TRUE)
    ON CONFLICT (code) DO NOTHING;
  `;

  // --- Shipping Rates Schema ---
  const createShippingRatesTable = `
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
  `;

  const seedShippingRates = `
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
  `;

  // --- Settings Table (for tax rate, free shipping threshold, etc.) ---
  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedSettings = `
    INSERT INTO settings (key, value, description) VALUES
    ('tax_rate', '{"rate": 19.25, "description": "Cameroon standard VAT rate as percentage"}', 'Tax rate percentage applied to subtotal'),
    ('free_shipping_threshold', '{"amount": 50000, "enabled": false}', 'Order subtotal above which shipping is free (in XAF)')
    ON CONFLICT (key) DO NOTHING;
  `;

  // --- Phase 3 Appointments Schema ---
  const createAppointmentsSchema = `
    CREATE TABLE IF NOT EXISTS spa_services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(50) DEFAULT 'Facial',
      image_url VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      appointment_number VARCHAR(50) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time VARCHAR(20) NOT NULL,
      time_slot_label VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
      notes TEXT,
      total_price DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointment_services (
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
      service_id INTEGER REFERENCES spa_services(id) ON DELETE CASCADE,
      price_at_booking DECIMAL(10, 2) NOT NULL,
      PRIMARY KEY (appointment_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS spa_slots (
      id SERIAL PRIMARY KEY,
      time VARCHAR(20) UNIQUE NOT NULL,
      label VARCHAR(50) NOT NULL,
      available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_slot 
    ON appointments (appointment_date, appointment_time, COALESCE(staff_id, 0)) 
    WHERE status IN ('pending', 'confirmed');
  `;

  const seedSpaData = `
    INSERT INTO spa_services (name, description, duration_minutes, price, category) VALUES
    ('Radiance Glow Facial', 'Our signature illuminating treatment using wild-harvested botanicals to restore natural luminosity.', 60, 35000, 'Facial'),
    ('Verdant Detox', 'Deep purification for urban skin using volcanic clay and forest-sourced antioxidants.', 45, 28000, 'Facial'),
    ('Lumière Peeling', 'Gentle enzyme exfoliation that unveils a velvety, Parisian porcelain finish.', 50, 42000, 'Facial'),
    ('Ancestral Hydration', 'Intense moisture therapy inspired by traditional balm-making.', 60, 45000, 'Facial'),
    ('Silk Smooth Wax', 'Full body exfoliation followed by our signature hypoallergenic resin application.', 45, 15000, 'Waxing'),
    ('Bikini Couture', 'Specialized waxing for sensitive areas with post-treatment soothing serum.', 30, 20000, 'Waxing'),
    ('Facial Refinement', 'Delicate brow and lip shaping for a perfectly framed silhouette.', 30, 12000, 'Waxing'),
    ('Lower Limbs Waxing', 'Complete leg smoothing ending with a calming floral water mist.', 40, 18000, 'Waxing'),
    ('Micro-Needling', 'Regenerative therapy to stimulate collagen, reduce scarring, and refine texture.', 90, 75000, 'Advanced Aesthetics'),
    ('LED Phototherapy', 'Targeted light spectrums to heal inflammation and accelerate cellular repair.', 45, 55000, 'Advanced Aesthetics'),
    ('Hydro-Infusion', 'Vacuum-assisted dermal cleaning paired with potent serum infusions.', 60, 65000, 'Advanced Aesthetics')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO spa_slots (time, label, available) VALUES
    ('09:00', '9:00 AM', true),
    ('10:00', '10:00 AM', true),
    ('11:00', '11:00 AM', true),
    ('12:00', '12:00 PM', true),
    ('13:00', '1:00 PM', true),
    ('14:00', '2:00 PM', true),
    ('15:00', '3:00 PM', true),
    ('16:00', '4:00 PM', true),
    ('17:00', '5:00 PM', true),
    ('18:00', '6:00 PM', true),
    ('19:00', '7:00 PM', true),
    ('20:00', '8:00 PM', true)
    ON CONFLICT (time) DO NOTHING;
  `;

  // --- Phase 5: Agencies & Delivery Methods ---
  const createAgenciesTable = `
    CREATE TABLE IF NOT EXISTS agencies (
      id              SERIAL PRIMARY KEY,
      name            VARCHAR(150) NOT NULL,
      origin_location VARCHAR(255),
      contact_phone   VARCHAR(50),
      is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_agencies_active   ON agencies(is_active);
    CREATE INDEX IF NOT EXISTS idx_agencies_verified ON agencies(is_verified);
  `;

  const createAgencyTownCoverageTable = `
    CREATE TABLE IF NOT EXISTS agency_town_coverage (
      id                          SERIAL PRIMARY KEY,
      agency_id                   INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      town_name                   VARCHAR(150) NOT NULL,
      destination_office_location VARCHAR(255),
      is_verified                 BOOLEAN NOT NULL DEFAULT FALSE,
      created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (agency_id, town_name)
    );
    CREATE INDEX IF NOT EXISTS idx_agency_town_agency_id ON agency_town_coverage(agency_id);
    CREATE INDEX IF NOT EXISTS idx_agency_town_town_name ON agency_town_coverage(town_name);
  `;

  const alterOrdersForDelivery = `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50)
      CHECK (delivery_method IN ('local_delivery', 'agency_shipping', 'pickup'));
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_agency_id ON orders(agency_id);
  `;

  const alterUsersForWhatsApp = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
  `;

  // Persist the customer's preferred mobile-money number so returning
  // customers don't have to re-enter it at checkout. Same VARCHAR(50)
  // pattern as whatsapp_number.
  const alterUsersForMomoNumber = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS momo_number VARCHAR(50);
  `;

  // Seed agencies — real Buea transport operators
  // is_verified = TRUE only for entries independently confirmed in research
  const seedAgencies = `
    INSERT INTO agencies (name, origin_location, contact_phone, is_verified, is_active) VALUES
      ('Afrique con Plc',           'Mile 17 Junction, Buea', '+237 657 675 501', TRUE,  TRUE),
      ('Vatican Express',            'Mile 17, beside Moghamo, Buea', NULL,        TRUE,  TRUE),
      ('Parklane Travels',           'Mile 18, Buea',          NULL,               TRUE,  TRUE),
      ('Nso Boyz Express',           'Main Park, Buea',        NULL,               TRUE,  TRUE),
      ('Musango Bus Services',        NULL,                    NULL,               FALSE, TRUE),
      ('Amour Mezam Express',         NULL,                    NULL,               FALSE, TRUE),
      ('Moghamo Travel Agency',       NULL,                    NULL,               FALSE, TRUE),
      ('Oasis Travels',               NULL,                    NULL,               FALSE, TRUE),
      ('Epie Rides',                  NULL,                    NULL,               FALSE, TRUE),
      ('Guarantee/Guaranty Express',  NULL,                    NULL,               FALSE, TRUE),
      ('General Express Voyages',     NULL,                    NULL,               FALSE, TRUE),
      ('Finexs Voyages Confort',      NULL,                    NULL,               FALSE, TRUE),
      ('Garanti Express',             NULL,                    NULL,               FALSE, TRUE),
      ('Le Voyageur VIP',             NULL,                    NULL,               FALSE, TRUE),
      ('Princess Voyages',            NULL,                    NULL,               FALSE, TRUE)
    ON CONFLICT DO NOTHING;
  `;

  const seedAgencyTownCoverage = `
    -- Douala coverage
    INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
    SELECT a.id, d.town, d.office, d.verified FROM agencies a
    JOIN (VALUES
      ('Afrique con Plc',         'Douala', 'Akwa and Bonaberi, Douala', TRUE),
      ('Vatican Express',         'Douala', NULL,                         TRUE),
      ('Musango Bus Services',    'Douala', NULL,                         FALSE),
      ('Amour Mezam Express',     'Douala', NULL,                         FALSE),
      ('Moghamo Travel Agency',   'Douala', NULL,                         FALSE),
      ('Oasis Travels',           'Douala', NULL,                         FALSE),
      ('Epie Rides',              'Douala', NULL,                         FALSE),
      ('General Express Voyages', 'Douala', NULL,                         FALSE)
    ) AS d(name, town, office, verified) ON a.name = d.name
    ON CONFLICT (agency_id, town_name) DO NOTHING;

    -- Yaoundé coverage
    INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
    SELECT a.id, d.town, d.office, d.verified FROM agencies a
    JOIN (VALUES
      ('Afrique con Plc',          'Yaounde', NULL,                           TRUE),
      ('Vatican Express',          'Yaounde', NULL,                           TRUE),
      ('Musango Bus Services',     'Yaounde', NULL,                           FALSE),
      ('Amour Mezam Express',      'Yaounde', NULL,                           FALSE),
      ('Moghamo Travel Agency',    'Yaounde', NULL,                           FALSE),
      ('Oasis Travels',            'Yaounde', NULL,                           FALSE),
      ('Epie Rides',               'Yaounde', NULL,                           FALSE),
      ('Parklane Travels',         'Yaounde', 'Mvan, beside COGENI, Yaoundé', TRUE),
      ('Finexs Voyages Confort',   'Yaounde', NULL,                           FALSE)
    ) AS d(name, town, office, verified) ON a.name = d.name
    ON CONFLICT (agency_id, town_name) DO NOTHING;

    -- Bamenda coverage
    INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
    SELECT a.id, d.town, d.office, d.verified FROM agencies a
    JOIN (VALUES
      ('Vatican Express',            'Bamenda', NULL,                    TRUE),
      ('Amour Mezam Express',        'Bamenda', NULL,                    TRUE),
      ('Nso Boyz Express',           'Bamenda', 'City Chemist, Bamenda', TRUE),
      ('Guarantee/Guaranty Express', 'Bamenda', 'City Chemist, Bamenda', FALSE),
      ('Garanti Express',            'Bamenda', NULL,                    FALSE),
      ('Moghamo Travel Agency',      'Bamenda', NULL,                    FALSE),
      ('Le Voyageur VIP',            'Bamenda', NULL,                    FALSE),
      ('Princess Voyages',           'Bamenda', NULL,                    FALSE)
    ) AS d(name, town, office, verified) ON a.name = d.name
    ON CONFLICT (agency_id, town_name) DO NOTHING;
  `;

  try {
    console.log('⏳ Initializing database schema...');
    
    // 1. Roles & Permissions setup
    await pool.query(createRolesTable);
    await pool.query(seedRoles);
    await pool.query(createPermissionsTable);
    await pool.query(seedPermissions);
    await pool.query(createRolePermissionsTable);
    await pool.query(seedRolePermissions);

    // 2. Users Table setup & update
    await pool.query(createUsersTable);
    await pool.query(alterUsersTable);
    await pool.query(migrateUserRoles);
    await pool.query(dropUserRoleColumn);

    // 3. Keep other existing tables
    await pool.query(createProductsTable);
    await pool.query(addMetadataColumn);
    await pool.query(createProductsIndexes);
    await pool.query(createCartItemsTable);
    await pool.query(createWishlistsTable);
    await pool.query(createCouponsTable);
    await pool.query(createOrdersTable);
    await pool.query(createPaymentsTable);
    await pool.query(alterOrdersTableForPayments);
    await pool.query(createCouponRedemptionsTable);
    await pool.query(alterOrdersForCoupons);
    await pool.query(seedCouponsPermission);
    await pool.query(seedGlow15Coupon);
    await pool.query(createReviewsSchema);
    await pool.query(seedReviewsPermission);
    await pool.query(createEventsTable);
    await pool.query(addSessionIdColumn);
    await pool.query(createEventsIndexes);
    await pool.query(createNotificationsTable);

    // 3b. Shipping rates & settings (tax rate, free shipping threshold)
    //     NOTE: these statements were previously defined above but never
    //     invoked here, so `shipping_rates` and `settings` never actually
    //     existed in the database — fixed as part of the shipping/tax work.
    await pool.query(createShippingRatesTable);
    await pool.query(seedShippingRates);
    await pool.query(createSettingsTable);
    await pool.query(seedSettings);

    // 4. Refresh Tokens setup
    await pool.query(createRefreshTokensTable);
    await pool.query(createExtraIndexes);

    // 5. Phase 3 Appointments Schema & Seed
    await pool.query(createAppointmentsSchema);
    await pool.query(seedSpaData);

    // 6. Bootstrap admin
    await pool.query(bootstrapAdmin);

    // 7. Phase 5: Multi-method delivery — agencies, coverage, delivery_method, whatsapp
    await pool.query(createAgenciesTable);
    await pool.query(createAgencyTownCoverageTable);
    await pool.query(alterOrdersForDelivery);
    await pool.query(alterUsersForWhatsApp);
    await pool.query(alterUsersForMomoNumber);
    await pool.query(seedAgencies);
    await pool.query(seedAgencyTownCoverage);

    // Seed initial products if table is empty
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      console.log('🌱 Seeding initial Claire Skiin products...');
      await pool.query(`
        INSERT INTO products (name, description, price, category, stock_quantity, image_url) VALUES
        ('Radiance Glow Serum', 'Brightening vitamin C serum with African botanicals for luminous skin.', 45.00, 'Skincare', 80, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAwC7CiCj6AvdhlpFDR6UxA9vRkcCGb1N-OZk-AWhSxe8cXvhkHQ1BnoOrtzmGSyXbNaqs6efhCv1fIgPEMHw_1lQ1SnE-LFMrlcVBsgv6MMm7OWAVmE7i3vyosX-Qr6ctVCg3xtg1xsCO0dOHN9uVLJiJx1z9uTJGR6S79vseniNmXGgssm2G6QnkhEnYpfPi0KIQsTUB_ceZFRmP_UpxvRJ0BDlnW7IQRrhUspjGdYcR2sPNQd-3DvXqkR4tFMyFMVMa_ScM_A'),
        ('Moisture Lock Cream', 'Deep hydration face cream infused with shea butter and baobab oil.', 38.50, 'Skincare', 120, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCju31J9E1L_iw1uRMh5RLu-g9UeonjCR__hge7so9CMkbxV0UVwwzAZg2espXk-Vt-bVQ7vTgqhb9bS77d0k6ZneBRBwRKV7BbK590jyrwBRUqlvcophAGjw2W_MBCE3a264iTwK-WJMBspwbRNSd0lM1pkGlaOGGau9PMZmXkWB6ABBpMbRybUgsfvUsSByfPnhqOse15U91-9gdCeE2nmDoeamJgrEuLsLnKWAUiJP0z5navocuv00rzOrnOoWd_qQS09dpVpJaY'),
        ('Botanical Lip Therapy', 'Nourishing lip balm with kokum butter and natural pigments.', 18.00, 'Lip Care', 200, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBcyes5xXseNgAQRwYOcwq5QcVx26kMpwRBOgTiqH1zgV9t7QBszf95MNJzKp4sgy-3JLbzRyvxKWE6ma6p2Ubfrl9Le665ImEomk3vrqPdwRtUNyT1y_w58pF8J7LsoEjY7dD1rpP99TVoOH_htqIjZrtwzppU-LamI2XLW-7jl7PjG3SmkGI7wwqUbDH74JuLYro-6lpHueL1sjTtG-YkJgwC37dgxvBLG-i6h1TU1SjxNxF2gpn-2Ce7KFoiGNrF76XVuaF4Uk'),
        ('Argan Repair Hair Mask', 'Intensive restorative hair mask with pure argan oil for silky, lustrous hair.', 35.00, 'Hair Care', 90, 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5cDFMnZvXSSpYF-YIPLBy0b-u7lAaaoIKCM0vjOSE2lbhmaEwYeyi4rozmKAMgu5KE3bSymRMeUW6gJaBromC_i4N9tJNzZjJ4plB_Yg9zGRmrrcVbtVa2qB0UV_KbIcq21qv0q4TSDENF4s3RvgtJWYfJoyZC-BYbJ4BxnHFIgBMWIs2DVWMTZ8z_lSq37YMdkj7VCvKQmeenefhv5n0kfmgAnPfoJ2mGuIT7qRiwexFPbkCvij63vDp4UMceGxqIiqsgLIJ8u8'),
        ('Scalp Nourish Oil', 'Stimulating scalp treatment with African black seed oil and peppermint.', 29.00, 'Hair Care', 110, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAwC7CiCj6AvdhlpFDR6UxA9vRkcCGb1N-OZk-AWhSxe8cXvhkHQ1BnoOrtzmGSyXbNaqs6efhCv1fIgPEMHw_1lQ1SnE-LFMrlcVBsgv6MMm7OWAVmE7i3vyosX-Qr6ctVCg3xtg1xsCO0dOHN9uVLJiJx1z9uTJGR6S79vseniNmXGgssm2G6QnkhEnYpfPi0KIQsTUB_ceZFRmP_UpxvRJ0BDlnW7IQRrhUspjGdYcR2sPNQd-3DvXqkR4tFMyFMVMa_ScM_A'),
        ('Rosehip Tinted Gloss', 'Natural tinted lip gloss enriched with rosehip oil for plump, hydrated lips.', 22.00, 'Lip Care', 150, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTHGH9sKQzQYs2Pm8lQ07wHWVMUSxq04Lg9RHdsTtWuMYF_2c62bAHE0hH8gu3A9Wjn-C4q6Kn1pk-FDylzsWoZrtdHi5G_WDerD7F2nIGSKqjxdtxqOIQERwCWArmfod2037juOv-0YWchsDeoB1pLxkvR3-4OWWORZ1mmE6MHyhgHF1Jyzry5JmCiAypmv6ktsPCnCo_B1H0l-YMofClhCqWSmYNbxO6fttH36gVekA6t8NJZ3LeAIKYRewkhXJsIjMRDEJCvZw')
      `);
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error;
  }
};
