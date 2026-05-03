-- ============================================================
-- BLB Church Chat System — Database Migration
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- 1. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2000),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_dept_created
  ON public.messages(department_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Chat restrictions (blocked = can see but not send; removed = cannot see at all)
CREATE TABLE IF NOT EXISTS public.chat_restrictions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  member_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('blocked', 'removed')),
  restricted_by UUID        REFERENCES public.profiles(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, member_id)
);

ALTER TABLE public.chat_restrictions ENABLE ROW LEVEL SECURITY;

-- 3. Pinned messages (one active pin per department)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  message_id    UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by     UUID        REFERENCES public.profiles(id),
  pinned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — Messages
-- ============================================================

-- SELECT: super_admin sees all; others see own dept (unless removed)
CREATE POLICY "messages_select" ON public.messages
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  OR (
    department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_restrictions
      WHERE department_id = messages.department_id
        AND member_id = auth.uid()
        AND type = 'removed'
    )
  )
);

-- INSERT: must be sending to own dept and not blocked/removed
CREATE POLICY "messages_insert" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_restrictions
    WHERE department_id = messages.department_id
      AND member_id = auth.uid()
      AND type IN ('blocked', 'removed')
  )
);

-- DELETE: own messages, or admin in same dept, or super_admin
CREATE POLICY "messages_delete" ON public.messages
FOR DELETE USING (
  sender_id = auth.uid()
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  OR (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- ============================================================
-- RLS Policies — Chat Restrictions
-- ============================================================

CREATE POLICY "restrictions_select" ON public.chat_restrictions
FOR SELECT USING (
  member_id = auth.uid()
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "restrictions_insert" ON public.chat_restrictions
FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "restrictions_update" ON public.chat_restrictions
FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "restrictions_delete" ON public.chat_restrictions
FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================
-- RLS Policies — Pinned Messages
-- ============================================================

CREATE POLICY "pinned_select" ON public.pinned_messages
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pinned_insert" ON public.pinned_messages
FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "pinned_update" ON public.pinned_messages
FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "pinned_delete" ON public.pinned_messages
FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================
-- Enable Realtime for live chat updates
-- ============================================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
