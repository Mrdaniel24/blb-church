-- ============================================================
-- CREATE ANNOUNCEMENTS TABLE — BLB Church
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vscjivuatnchqwtcgggn/editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id            uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  title         text        NOT NULL,
  content       text        NOT NULL,
  priority      text        NOT NULL DEFAULT 'general',
  target_type   text        NOT NULL DEFAULT 'general',
  department_id uuid        NULL,
  created_by    uuid        NOT NULL,
  is_active     boolean     NULL DEFAULT true,
  created_at    timestamptz NULL DEFAULT now(),
  expires_at    timestamptz NULL,

  CONSTRAINT announcements_pkey PRIMARY KEY (id),

  CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE CASCADE,

  CONSTRAINT announcements_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,

  CONSTRAINT announcements_priority_check
    CHECK (priority = ANY (ARRAY['urgent','new','update','general'])),

  -- 'public' = visible on landing page to everyone (no login needed)
  -- 'general' = all logged-in members
  -- 'department' = one specific department
  CONSTRAINT announcements_target_type_check
    CHECK (target_type = ANY (ARRAY['general','department','public']))
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON public.announcements (is_active);

CREATE INDEX IF NOT EXISTS idx_announcements_target
  ON public.announcements (target_type);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON public.announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_public
  ON public.announcements (target_type, is_active, created_at DESC)
  WHERE target_type = 'public';

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 1. Public announcements: everyone can read (even without login)
CREATE POLICY "Public announcements readable by all"
  ON public.announcements
  FOR SELECT
  USING (target_type = 'public' AND is_active = true);

-- 2. General + department announcements: only logged-in members
CREATE POLICY "Members can read general and their dept announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    target_type = 'general'
    OR (
      target_type = 'department'
      AND department_id = (
        SELECT department_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- 3. Admins and super_admins can read ALL announcements
CREATE POLICY "Admins can read all announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- 4. Admins/super_admins can INSERT
CREATE POLICY "Admins can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Admins/super_admins can UPDATE
CREATE POLICY "Admins can update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- 6. Admins/super_admins can DELETE
CREATE POLICY "Admins can delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );
