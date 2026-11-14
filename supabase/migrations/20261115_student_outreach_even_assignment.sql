-- Securely distribute a campus roster among member accounts selected by a coordinator.
CREATE OR REPLACE FUNCTION public.student_outreach_callers()
RETURNS TABLE(id UUID, full_name TEXT, email TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.status = 'active'
    AND p.role = 'member'
    AND public.student_outreach_is_coordinator()
  ORDER BY p.full_name NULLS LAST, p.email;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_callers() TO authenticated;

CREATE OR REPLACE FUNCTION public.student_outreach_assign_campus(
  p_campus TEXT,
  p_caller_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_count INTEGER;
  assigned_count INTEGER := 0;
  student_row RECORD;
  result JSONB := '[]'::JSONB;
  caller_id UUID;
  caller_index INTEGER := 0;
BEGIN
  IF NOT public.student_outreach_is_coordinator() THEN
    RAISE EXCEPTION 'Coordinator access required';
  END IF;
  IF nullif(btrim(p_campus), '') IS NULL THEN RAISE EXCEPTION 'Chagua chuo'; END IF;
  IF p_caller_ids IS NULL OR cardinality(p_caller_ids) = 0 THEN
    RAISE EXCEPTION 'Andika majina ya wapigaji wenye akaunti hai ya BLB';
  END IF;

  SELECT count(DISTINCT id) INTO caller_count
  FROM public.profiles
  WHERE id = ANY(p_caller_ids) AND status = 'active' AND role = 'member';
  IF caller_count <> cardinality(ARRAY(SELECT DISTINCT unnest(p_caller_ids))) THEN
    RAISE EXCEPTION 'Baadhi ya wapigaji hawana akaunti hai ya BLB';
  END IF;

  FOR student_row IN
    SELECT id FROM public.student_outreach_students
    WHERE campus = btrim(p_campus)
    ORDER BY full_name, id
  LOOP
    caller_id := p_caller_ids[(caller_index % cardinality(p_caller_ids)) + 1];
    UPDATE public.student_outreach_students
      SET assigned_caller = caller_id
      WHERE id = student_row.id;
    caller_index := caller_index + 1;
    assigned_count := assigned_count + 1;
  END LOOP;

  FOR caller_index IN 1..cardinality(p_caller_ids) LOOP
    caller_id := p_caller_ids[caller_index];
    result := result || jsonb_build_array(jsonb_build_object(
      'id', caller_id,
      'assigned', (SELECT count(*) FROM public.student_outreach_students
                   WHERE campus = btrim(p_campus) AND assigned_caller = caller_id)
    ));
  END LOOP;
  RETURN jsonb_build_object('total', assigned_count, 'callers', result);
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_outreach_assign_campus(TEXT, UUID[]) TO authenticated;

