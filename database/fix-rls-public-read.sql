-- ═══════════════════════════════════════════════════════
-- Fix: Allow public (homepage) to read system_settings
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Enable RLS if not already enabled
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone (including anonymous homepage visitors) to READ settings
DROP POLICY IF EXISTS "public_read_system_settings" ON system_settings;
CREATE POLICY "public_read_system_settings" ON system_settings
  FOR SELECT USING (true);

-- 3. Only authenticated admins/super_admins can UPDATE settings
DROP POLICY IF EXISTS "admin_write_system_settings" ON system_settings;
CREATE POLICY "admin_write_system_settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND status = 'active'
    )
  );
