-- Add 'public' as a valid target_type for announcements
-- Public announcements appear as pop-up banners on the public landing page (index.html)
-- Run in Supabase SQL Editor

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_target_type_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_target_type_check
    CHECK (target_type = ANY (ARRAY['general'::text, 'department'::text, 'public'::text]));

-- Index for fetching public announcements quickly on the landing page
CREATE INDEX IF NOT EXISTS idx_announcements_public
  ON public.announcements (target_type, is_active, created_at DESC)
  WHERE target_type = 'public';
