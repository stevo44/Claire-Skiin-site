-- =============================================================================
-- Migration: Phase 3 — Appointments / Spa Booking System (Claire Skiin)
-- =============================================================================

-- 1. Create Spa Services Table
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

-- 2. Create Appointments Table
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

-- 3. Create Appointment Services Junction Table (for multi-procedure bookings)
CREATE TABLE IF NOT EXISTS appointment_services (
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES spa_services(id) ON DELETE CASCADE,
    price_at_booking DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (appointment_id, service_id)
);

-- 4. Create Time Slots Table (Admin-managed available slots)
CREATE TABLE IF NOT EXISTS spa_slots (
    id SERIAL PRIMARY KEY,
    time VARCHAR(20) UNIQUE NOT NULL,
    label VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes for Performance & Double-Booking Prevention
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);

-- Partial Unique Index to enforce double-booking prevention at Database Level:
-- Prevents two active (pending/confirmed) appointments on the same date + time + staff (or global unassigned staff)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_slot 
ON appointments (appointment_date, appointment_time, COALESCE(staff_id, 0)) 
WHERE status IN ('pending', 'confirmed');

-- 6. Permissions & Role Assignments
INSERT INTO permissions (key, description) VALUES
('appointments:view', 'Ability to view appointments'),
('appointments:update_status', 'Ability to update appointments')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to admin, manager, staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'manager', 'staff')
  AND p.key IN ('appointments:view', 'appointments:update_status')
ON CONFLICT DO NOTHING;

-- 7. Seed Initial Spa Services
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

-- 8. Seed Default Time Slots
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
