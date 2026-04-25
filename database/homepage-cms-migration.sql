-- ═══════════════════════════════════════════════════════
-- Homepage CMS Migration
-- Run this in the Supabase SQL editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════

-- 1. Extend system_settings with homepage content columns
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS hero_badge_text         TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtext            TEXT,
  ADD COLUMN IF NOT EXISTS about_label             TEXT,
  ADD COLUMN IF NOT EXISTS about_heading           TEXT,
  ADD COLUMN IF NOT EXISTS about_quote             TEXT,
  ADD COLUMN IF NOT EXISTS about_body              TEXT,
  ADD COLUMN IF NOT EXISTS about_main_image_url    TEXT,
  ADD COLUMN IF NOT EXISTS about_accent_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS ministries_label        TEXT,
  ADD COLUMN IF NOT EXISTS ministries_heading      TEXT,
  ADD COLUMN IF NOT EXISTS bento_feature_title     TEXT,
  ADD COLUMN IF NOT EXISTS bento_feature_desc      TEXT,
  ADD COLUMN IF NOT EXISTS bento_feature_image_url TEXT;

-- 2. Create service_times table
CREATE TABLE IF NOT EXISTS service_times (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  display_order INT     NOT NULL DEFAULT 0,
  icon          TEXT    NOT NULL DEFAULT 'church',
  day_label     TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  description   TEXT,
  time_label    TEXT    NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. Seed the 3 existing services
INSERT INTO service_times (display_order, icon, day_label, title, description, time_label)
SELECT 1, 'auto_awesome', 'Saturday', 'Vigil Service', 'Traditional liturgical experience with choral accompaniment.', '5:00 PM'
WHERE NOT EXISTS (SELECT 1 FROM service_times WHERE title = 'Vigil Service');

INSERT INTO service_times (display_order, icon, day_label, title, description, time_label)
SELECT 2, 'light_mode', 'Sunday', 'Morning Service', 'Contemporary service with our live ministry band and youth program.', '9:00 AM'
WHERE NOT EXISTS (SELECT 1 FROM service_times WHERE title = 'Morning Service');

INSERT INTO service_times (display_order, icon, day_label, title, description, time_label)
SELECT 3, 'sunny', 'Sunday', 'The Gathering', 'A focused teaching session followed by community communion.', '11:30 AM'
WHERE NOT EXISTS (SELECT 1 FROM service_times WHERE title = 'The Gathering');

-- 4. Row Level Security
ALTER TABLE service_times ENABLE ROW LEVEL SECURITY;

-- Public: read active rows (for index page)
DROP POLICY IF EXISTS "public_read_service_times" ON service_times;
CREATE POLICY "public_read_service_times" ON service_times
  FOR SELECT USING (is_active = true);

-- Admins: full write access
DROP POLICY IF EXISTS "admin_write_service_times" ON service_times;
CREATE POLICY "admin_write_service_times" ON service_times
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND status = 'active'
    )
  );
