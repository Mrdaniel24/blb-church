-- ═══════════════════════════════════════════════════════
-- Fix: Public stats for homepage (member count, ministry count)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Creates a SECURITY DEFINER function so anon users get real counts
-- without bypassing RLS on sensitive data elsewhere

CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'member_count',   (SELECT COUNT(*) FROM profiles   WHERE status    = 'active'),
    'ministry_count', (SELECT COUNT(*) FROM departments WHERE is_active = true)
  );
$$;

-- Allow anon and authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon, authenticated;
