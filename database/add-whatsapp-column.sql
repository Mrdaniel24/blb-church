-- ── 1. Add whatsapp column to profiles ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- ── 2. Remove the auto-seeded contacts (if add-location-contacts.sql was run) ─
TRUNCATE TABLE church_contacts;

-- ── 3. (Optional) Check: see which admins/super_admins have set their WhatsApp
-- SELECT full_name, role, whatsapp FROM profiles
-- WHERE role IN ('admin','super_admin') AND status = 'active'
-- ORDER BY role, full_name;
