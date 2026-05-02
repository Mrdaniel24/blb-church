-- ── 1. Add location columns to system_settings ─────────────────────────────
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS church_lat  DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS church_lng  DECIMAL(11, 8);

-- ── 2. Create church_contacts table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS church_contacts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name TEXT        NOT NULL,
  role_label      TEXT        NOT NULL,
  phone           TEXT,
  email           TEXT,
  is_public       BOOLEAN     NOT NULL DEFAULT true,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE church_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public contacts readable by anyone"
  ON church_contacts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Super admin manages contacts"
  ON church_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ── 4. Seed sample contacts (edit phone/email after running) ─────────────────
INSERT INTO church_contacts (department_name, role_label, phone, email, sort_order) VALUES
  ('Ofisi ya Kanisa',  'Ofisi Kuu',          '+255 700 000 001', 'office@blbchurch.co.tz',   1),
  ('Timu ya Maombi',   'Kiongozi wa Maombi', '+255 700 000 002', 'prayer@blbchurch.co.tz',   2),
  ('Idara ya Media',   'Msimamizi wa Media', '+255 700 000 003', 'media@blbchurch.co.tz',    3),
  ('Huduma za Waumini','Mshauri wa Waumini', '+255 700 000 004', 'members@blbchurch.co.tz',  4)
ON CONFLICT DO NOTHING;
