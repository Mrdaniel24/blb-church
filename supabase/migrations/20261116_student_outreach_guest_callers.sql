-- Guest callers use private, revocable links scoped to their assigned students.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.student_outreach_manual_callers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  normalized_name TEXT GENERATED ALWAYS AS (lower(btrim(full_name))) STORED UNIQUE,
  link_token_hash TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_outreach_students
  ADD COLUMN IF NOT EXISTS assigned_caller_manual_id UUID
  REFERENCES public.student_outreach_manual_callers(id) ON DELETE SET NULL;
ALTER TABLE public.student_outreach_call_history
  ALTER COLUMN caller_id DROP NOT NULL;
ALTER TABLE public.student_outreach_call_history
  ADD COLUMN IF NOT EXISTS manual_caller_id UUID
  REFERENCES public.student_outreach_manual_callers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_outreach_manual_assignment_idx
  ON public.student_outreach_students(assigned_caller_manual_id);
CREATE INDEX IF NOT EXISTS student_outreach_manual_history_idx
  ON public.student_outreach_call_history(manual_caller_id, called_at DESC);

CREATE OR REPLACE FUNCTION public.student_outreach_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.student_outreach_is_coordinator()
    AND ROW(NEW.full_name, NEW.phone, NEW.campus, NEW.assigned_caller, NEW.assigned_caller_manual_id, NEW.invited_for, NEW.created_by)
        IS DISTINCT FROM ROW(OLD.full_name, OLD.phone, OLD.campus, OLD.assigned_caller, OLD.assigned_caller_manual_id, OLD.invited_for, OLD.created_by) THEN
    RAISE EXCEPTION 'Callers may only update call status and notes';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.student_outreach_manual_callers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_outreach_manual_callers_admin ON public.student_outreach_manual_callers;
CREATE POLICY student_outreach_manual_callers_admin ON public.student_outreach_manual_callers
  FOR ALL TO authenticated USING (public.student_outreach_is_coordinator())
  WITH CHECK (public.student_outreach_is_coordinator());
GRANT SELECT, INSERT, UPDATE ON public.student_outreach_manual_callers TO authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_manual_callers()
RETURNS TABLE(id UUID, full_name TEXT, assigned BIGINT, calls BIGINT, confirmed BIGINT, not_confirmed BIGINT, no_answer BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.full_name,
    count(DISTINCT s.id) AS assigned,
    count(DISTINCT h.id) AS calls,
    count(DISTINCT s.id) FILTER (WHERE s.call_status = 'confirmed') AS confirmed,
    count(DISTINCT s.id) FILTER (WHERE s.call_status = 'not_confirmed') AS not_confirmed,
    count(DISTINCT s.id) FILTER (WHERE s.call_status = 'no_answer') AS no_answer
  FROM public.student_outreach_manual_callers c
  LEFT JOIN public.student_outreach_students s ON s.assigned_caller_manual_id = c.id
  LEFT JOIN public.student_outreach_call_history h ON h.manual_caller_id = c.id
  WHERE public.student_outreach_is_coordinator()
  GROUP BY c.id, c.full_name
  ORDER BY c.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_manual_callers() TO authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_assign_manual_campus(p_campus TEXT, p_names TEXT[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_ids UUID[] := ARRAY[]::UUID[];
  clean_name TEXT;
  caller_id UUID;
  student_row RECORD;
  i INTEGER := 0;
  assigned_total INTEGER := 0;
  caller_results JSONB := '[]'::JSONB;
BEGIN
  IF NOT public.student_outreach_is_coordinator() THEN RAISE EXCEPTION 'Coordinator access required'; END IF;
  IF nullif(btrim(p_campus), '') IS NULL THEN RAISE EXCEPTION 'Chagua chuo'; END IF;
  IF p_names IS NULL OR cardinality(p_names) = 0 THEN RAISE EXCEPTION 'Chagua au andika angalau jina moja la mpigaji'; END IF;

  FOREACH clean_name IN ARRAY p_names LOOP
    clean_name := left(btrim(clean_name), 120);
    IF clean_name = '' THEN CONTINUE; END IF;
    INSERT INTO public.student_outreach_manual_callers(full_name, created_by)
      VALUES (clean_name, auth.uid())
      ON CONFLICT (normalized_name) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id INTO caller_id;
    IF NOT caller_id = ANY(caller_ids) THEN caller_ids := array_append(caller_ids, caller_id); END IF;
  END LOOP;
  IF cardinality(caller_ids) = 0 THEN RAISE EXCEPTION 'Chagua au andika angalau jina moja la mpigaji'; END IF;

  FOR student_row IN
    SELECT id FROM public.student_outreach_students
    WHERE campus = btrim(p_campus)
    ORDER BY full_name, id
  LOOP
    UPDATE public.student_outreach_students
      SET assigned_caller_manual_id = caller_ids[(i % cardinality(caller_ids)) + 1],
          assigned_caller = NULL
      WHERE id = student_row.id;
    i := i + 1;
    assigned_total := assigned_total + 1;
  END LOOP;

  FOR i IN 1..cardinality(caller_ids) LOOP
    caller_id := caller_ids[i];
    caller_results := caller_results || jsonb_build_array(jsonb_build_object(
      'id', caller_id,
      'full_name', (SELECT c.full_name FROM public.student_outreach_manual_callers c WHERE c.id = caller_id),
      'assigned', (SELECT count(*) FROM public.student_outreach_students s WHERE s.campus = btrim(p_campus) AND s.assigned_caller_manual_id = caller_id)
    ));
  END LOOP;
  RETURN jsonb_build_object('total', assigned_total, 'callers', caller_results);
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_assign_manual_campus(TEXT, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_make_manual_caller_link(p_caller_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE token TEXT := replace(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', '');
BEGIN
  IF NOT public.student_outreach_is_coordinator() THEN RAISE EXCEPTION 'Coordinator access required'; END IF;
  UPDATE public.student_outreach_manual_callers
    SET link_token_hash = encode(digest(token, 'sha256'), 'hex')
    WHERE id = p_caller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mpigaji hajapatikana'; END IF;
  RETURN token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_make_manual_caller_link(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_open_manual_caller(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE c public.student_outreach_manual_callers%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.student_outreach_manual_callers
  WHERE link_token_hash = encode(digest(p_token, 'sha256'), 'hex');
  IF NOT FOUND THEN RAISE EXCEPTION 'Link si sahihi au imebadilishwa'; END IF;
  RETURN jsonb_build_object(
    'caller', jsonb_build_object('id', c.id, 'full_name', c.full_name),
    'students', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'full_name', s.full_name, 'phone', s.phone,
      'call_status', s.call_status, 'latest_note', s.latest_note
    ) ORDER BY s.full_name) FROM public.student_outreach_students s
      WHERE s.assigned_caller_manual_id = c.id), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', h.id, 'student_id', h.student_id, 'manual_caller_id', h.manual_caller_id, 'call_status', h.call_status,
      'note', h.note, 'called_at', h.called_at
    ) ORDER BY h.called_at DESC) FROM public.student_outreach_call_history h
      JOIN public.student_outreach_students s ON s.id = h.student_id AND s.assigned_caller_manual_id = c.id
      WHERE h.manual_caller_id = c.id), '[]'::jsonb)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_open_manual_caller(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_record_manual_call(
  p_token TEXT, p_student_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE c public.student_outreach_manual_callers%ROWTYPE;
BEGIN
  IF p_status NOT IN ('pending', 'confirmed', 'not_confirmed', 'no_answer') THEN RAISE EXCEPTION 'Hali ya simu si sahihi'; END IF;
  SELECT * INTO c FROM public.student_outreach_manual_callers
  WHERE link_token_hash = encode(digest(p_token, 'sha256'), 'hex');
  IF NOT FOUND THEN RAISE EXCEPTION 'Link si sahihi au imebadilishwa'; END IF;
  UPDATE public.student_outreach_students
    SET call_status = p_status,
        latest_note = CASE WHEN p_note IS NULL THEN latest_note ELSE nullif(btrim(p_note), '') END
    WHERE id = p_student_id AND assigned_caller_manual_id = c.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mwanafunzi huyu hajagawiwa kwa link hii'; END IF;
  INSERT INTO public.student_outreach_call_history(student_id, caller_id, manual_caller_id, call_status, note)
    VALUES (p_student_id, NULL, c.id, p_status, nullif(btrim(p_note), ''));
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_record_manual_call(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

