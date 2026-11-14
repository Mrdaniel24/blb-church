-- Student outreach and weekly calling workflow.
-- Apply with the Supabase SQL editor or `supabase db push`.

CREATE TABLE IF NOT EXISTS public.student_outreach_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  campus TEXT NOT NULL,
  assigned_caller UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (call_status IN ('pending', 'confirmed', 'not_confirmed', 'no_answer')),
  latest_note TEXT,
  invited_for DATE,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_outreach_students
  ADD COLUMN IF NOT EXISTS invited_for DATE;

CREATE TABLE IF NOT EXISTS public.student_outreach_call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_outreach_students(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  call_status TEXT NOT NULL CHECK (call_status IN ('pending', 'confirmed', 'not_confirmed', 'no_answer')),
  note TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_outreach_campus_idx ON public.student_outreach_students(campus);
CREATE INDEX IF NOT EXISTS student_outreach_caller_idx ON public.student_outreach_students(assigned_caller);
CREATE INDEX IF NOT EXISTS student_outreach_status_idx ON public.student_outreach_students(call_status);
CREATE INDEX IF NOT EXISTS student_outreach_history_student_idx ON public.student_outreach_call_history(student_id, called_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS student_outreach_phone_unique_idx
  ON public.student_outreach_students(phone) WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE OR REPLACE FUNCTION public.student_outreach_is_coordinator()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.admin_permissions ap ON ap.admin_id = p.id
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'admin'
      AND ap.can_manage_members IS TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.student_outreach_callers()
RETURNS TABLE(id UUID, full_name TEXT, email TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.status = 'active'
    AND public.student_outreach_is_coordinator()
  ORDER BY p.full_name NULLS LAST, p.email;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_callers() TO authenticated;

ALTER TABLE public.student_outreach_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_outreach_call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_outreach_read_assigned ON public.student_outreach_students;
CREATE POLICY student_outreach_read_assigned ON public.student_outreach_students
  FOR SELECT TO authenticated USING (assigned_caller = auth.uid() OR public.student_outreach_is_coordinator());

DROP POLICY IF EXISTS student_outreach_coordinator_insert ON public.student_outreach_students;
CREATE POLICY student_outreach_coordinator_insert ON public.student_outreach_students
  FOR INSERT TO authenticated WITH CHECK (public.student_outreach_is_coordinator());

DROP POLICY IF EXISTS student_outreach_coordinator_update ON public.student_outreach_students;
CREATE POLICY student_outreach_coordinator_update ON public.student_outreach_students
  FOR UPDATE TO authenticated USING (assigned_caller = auth.uid() OR public.student_outreach_is_coordinator())
  WITH CHECK (
    public.student_outreach_is_coordinator()
    OR (
      assigned_caller = auth.uid()
      AND call_status IN ('pending', 'confirmed', 'not_confirmed', 'no_answer')
    )
  );

DROP POLICY IF EXISTS student_outreach_coordinator_delete ON public.student_outreach_students;
CREATE POLICY student_outreach_coordinator_delete ON public.student_outreach_students
  FOR DELETE TO authenticated USING (public.student_outreach_is_coordinator());

DROP POLICY IF EXISTS student_outreach_history_read ON public.student_outreach_call_history;
CREATE POLICY student_outreach_history_read ON public.student_outreach_call_history
  FOR SELECT TO authenticated USING (
    caller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.student_outreach_students s
      WHERE s.id = student_id AND s.assigned_caller = auth.uid()
    )
    OR public.student_outreach_is_coordinator()
  );

DROP POLICY IF EXISTS student_outreach_history_insert ON public.student_outreach_call_history;
CREATE POLICY student_outreach_history_insert ON public.student_outreach_call_history
  FOR INSERT TO authenticated WITH CHECK (
    caller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.student_outreach_students s
      WHERE s.id = student_id AND (s.assigned_caller = auth.uid() OR public.student_outreach_is_coordinator())
    )
  );

DROP POLICY IF EXISTS student_outreach_history_coordinator_update ON public.student_outreach_call_history;
CREATE POLICY student_outreach_history_coordinator_update ON public.student_outreach_call_history
  FOR UPDATE TO authenticated USING (public.student_outreach_is_coordinator())
  WITH CHECK (public.student_outreach_is_coordinator());

CREATE OR REPLACE FUNCTION public.student_outreach_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.student_outreach_is_coordinator()
    AND ROW(NEW.full_name, NEW.phone, NEW.campus, NEW.assigned_caller, NEW.invited_for, NEW.created_by)
        IS DISTINCT FROM ROW(OLD.full_name, OLD.phone, OLD.campus, OLD.assigned_caller, OLD.invited_for, OLD.created_by) THEN
    RAISE EXCEPTION 'Callers may only update call status and notes';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_outreach_updated_at ON public.student_outreach_students;
CREATE TRIGGER student_outreach_updated_at
  BEFORE UPDATE ON public.student_outreach_students
  FOR EACH ROW EXECUTE FUNCTION public.student_outreach_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_outreach_students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_outreach_call_history TO authenticated;

