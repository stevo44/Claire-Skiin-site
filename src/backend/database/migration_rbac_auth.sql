-- =============================================================================
-- Migration: Phase 1 — Database Foundations, RBAC, and Auth Completion
-- =============================================================================

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Roles
INSERT INTO roles (name, description) VALUES
('admin', 'Super Administrator with full portal control.'),
('manager', 'Manager with access to system operations and reporting.'),
('staff', 'Staff members assisting with orders, appointments, and inventory.'),
('customer', 'Default customer role for shopping and ordering.')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Permissions
INSERT INTO permissions (key, description) VALUES
('orders:view', 'Ability to view orders'),
('orders:update_status', 'Ability to update order status'),
('appointments:view', 'Ability to view appointments'),
('appointments:update_status', 'Ability to update appointments'),
('inventory:update', 'Ability to update product/inventory stock'),
('analytics:view', 'Ability to view financial reports and analytics'),
('products:delete', 'Ability to delete products'),
('users:manage', 'Ability to manage users and roles')
ON CONFLICT (key) DO NOTHING;

-- 3. Create Role Permissions Join Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed Role Permissions mappings
-- Admin permissions (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Staff permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
  AND p.key IN ('orders:view', 'orders:update_status', 'appointments:view', 'appointments:update_status', 'inventory:update')
ON CONFLICT DO NOTHING;

-- Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.key IN ('orders:view', 'orders:update_status', 'appointments:view', 'appointments:update_status', 'inventory:update', 'analytics:view', 'products:delete')
ON CONFLICT DO NOTHING;

-- 4. Update Users Table Schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL;

-- Migrate Old User Roles to role_ids
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE role_id IS NULL AND (role = 'admin');

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'customer')
WHERE role_id IS NULL AND (role = 'user' OR role = 'customer' OR role IS NULL);

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'staff')
WHERE role_id IS NULL AND (role = 'staff');

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'manager')
WHERE role_id IS NULL AND (role = 'manager');

-- Drop Old Role Column If It Exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='users' AND column_name='role'
  ) THEN
    ALTER TABLE users DROP COLUMN role;
  END IF;
END
$$;

-- 5. Create Refresh Tokens Table
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

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Bootstrap default administrator email if present
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE email = 'stephenngulle@gmail.com';
