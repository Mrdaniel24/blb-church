-- ═══════════════════════════════════════════════════════
-- Ministry Image Migration
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════

-- Add image_url column to departments
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Allow admins to update departments (image_url, name, description)
-- (departments likely already has RLS — add write policy if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'departments' AND policyname = 'admin_write_departments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "admin_write_departments" ON departments
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin')
              AND status = 'active'
          )
        )
    $pol$;
  END IF;
END $$;
