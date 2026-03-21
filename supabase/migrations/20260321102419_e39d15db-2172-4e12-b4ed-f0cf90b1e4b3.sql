
-- ============================================================
-- Schema Hardening Migration
-- ============================================================

-- 1. JSON shape checks
ALTER TABLE public.batch_logs DROP CONSTRAINT IF EXISTS chk_structured_payload_object;
ALTER TABLE public.batch_logs ADD CONSTRAINT chk_structured_payload_object
  CHECK (jsonb_typeof(structured_payload) = 'object');

ALTER TABLE public.assistant_messages DROP CONSTRAINT IF EXISTS chk_context_snapshot_object;
ALTER TABLE public.assistant_messages ADD CONSTRAINT chk_context_snapshot_object
  CHECK (jsonb_typeof(context_snapshot) = 'object');

ALTER TABLE public.flavour_presets DROP CONSTRAINT IF EXISTS chk_ingredient_form_supported_array;
ALTER TABLE public.flavour_presets ADD CONSTRAINT chk_ingredient_form_supported_array
  CHECK (jsonb_typeof(ingredient_form_supported) = 'array');

-- 2. Lifecycle consistency on kombucha_batches
ALTER TABLE public.kombucha_batches DROP CONSTRAINT IF EXISTS chk_starter_source_consistency;
ALTER TABLE public.kombucha_batches ADD CONSTRAINT chk_starter_source_consistency CHECK (
  (starter_source_type = 'manual' AND starter_source_batch_id IS NULL)
  OR
  (starter_source_type = 'previous_batch' AND starter_source_batch_id IS NOT NULL)
);

ALTER TABLE public.kombucha_batches DROP CONSTRAINT IF EXISTS chk_lifecycle_consistency;
ALTER TABLE public.kombucha_batches ADD CONSTRAINT chk_lifecycle_consistency CHECK (
  CASE status
    WHEN 'active' THEN
      completed_at IS NULL AND archived_at IS NULL AND discarded_at IS NULL
      AND current_stage NOT IN ('completed', 'archived', 'discarded')
    WHEN 'completed' THEN
      current_stage = 'completed' AND completed_at IS NOT NULL
    WHEN 'archived' THEN
      current_stage = 'archived' AND archived_at IS NOT NULL
    WHEN 'discarded' THEN
      current_stage = 'discarded' AND discarded_at IS NOT NULL
    ELSE false
  END
);

-- 3. Log validation trigger (using trigger instead of CHECK for mutable logic)
CREATE OR REPLACE FUNCTION public.validate_batch_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.log_type = 'ph_check' AND NEW.value_number IS NOT NULL THEN
    IF NEW.value_number < 0 OR NEW.value_number > 14 THEN
      RAISE EXCEPTION 'pH value must be between 0 and 14, got %', NEW.value_number;
    END IF;
  END IF;

  IF NEW.log_type = 'temp_check' AND NEW.value_number IS NOT NULL THEN
    IF lower(coalesce(NEW.value_unit, 'celsius')) IN ('fahrenheit', '°f', 'f') THEN
      IF NEW.value_number < 23 OR NEW.value_number > 140 THEN
        RAISE EXCEPTION 'Temperature in Fahrenheit must be between 23 and 140, got %', NEW.value_number;
      END IF;
    ELSE
      IF NEW.value_number < -5 OR NEW.value_number > 60 THEN
        RAISE EXCEPTION 'Temperature in Celsius must be between -5 and 60, got %', NEW.value_number;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_batch_log ON public.batch_logs;
CREATE TRIGGER trg_validate_batch_log
  BEFORE INSERT OR UPDATE ON public.batch_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_batch_log();

-- 4. Harden F2
ALTER TABLE public.batch_f2_setups ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

-- Backfill: only newest setup per batch is current
UPDATE public.batch_f2_setups SET is_current = false
WHERE id NOT IN (
  SELECT DISTINCT ON (batch_id) id
  FROM public.batch_f2_setups
  ORDER BY batch_id, setup_created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_f2_per_batch
  ON public.batch_f2_setups (batch_id) WHERE (is_current = true);

-- Nonblank bottle label
ALTER TABLE public.batch_bottles DROP CONSTRAINT IF EXISTS chk_bottle_label_nonblank;
ALTER TABLE public.batch_bottles ADD CONSTRAINT chk_bottle_label_nonblank
  CHECK (bottle_label IS NULL OR length(trim(bottle_label)) > 0);

-- Unique label per setup
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_bottle_label_per_setup
  ON public.batch_bottles (f2_setup_id, lower(trim(bottle_label)))
  WHERE (bottle_label IS NOT NULL AND trim(bottle_label) <> '');

-- 5. Same-user reference triggers
CREATE OR REPLACE FUNCTION public.enforce_same_user_starter_batch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.starter_source_batch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.kombucha_batches
      WHERE id = NEW.starter_source_batch_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'starter_source_batch_id must belong to the same user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_starter ON public.kombucha_batches;
CREATE TRIGGER trg_enforce_same_user_starter
  BEFORE INSERT OR UPDATE ON public.kombucha_batches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_user_starter_batch();

CREATE OR REPLACE FUNCTION public.enforce_same_user_linked_batch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_batch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.kombucha_batches
      WHERE id = NEW.linked_batch_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'linked_batch_id must belong to the same user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_linked_batch ON public.assistant_conversations;
CREATE TRIGGER trg_enforce_same_user_linked_batch
  BEFORE INSERT OR UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_user_linked_batch();

-- 6. Stage history automation
CREATE OR REPLACE FUNCTION public.auto_stage_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.batch_stage_events (batch_id, from_stage, to_stage, triggered_by)
    VALUES (NEW.id, NULL, NEW.current_stage, 'system:auto_insert');
  ELSIF TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO public.batch_stage_events (batch_id, from_stage, to_stage, triggered_by)
    VALUES (NEW.id, OLD.current_stage, NEW.current_stage, 'system:auto_transition');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_stage_event ON public.kombucha_batches;
CREATE TRIGGER trg_auto_stage_event
  AFTER INSERT OR UPDATE ON public.kombucha_batches
  FOR EACH ROW EXECUTE FUNCTION public.auto_stage_event();

-- Backfill initial stage events for batches missing one
INSERT INTO public.batch_stage_events (batch_id, from_stage, to_stage, triggered_by, created_at)
SELECT b.id, NULL, b.current_stage, 'system:backfill', b.created_at
FROM public.kombucha_batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.batch_stage_events e
  WHERE e.batch_id = b.id AND e.from_stage IS NULL
);

-- 7. Remove SECURITY DEFINER from helper functions
CREATE OR REPLACE FUNCTION public.get_batch_overdue_count(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer FROM public.batch_reminders
    WHERE batch_id = p_batch_id AND is_completed = false AND dismissed_at IS NULL AND due_at < now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_batch_active_reminder_count(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer FROM public.batch_reminders
    WHERE batch_id = p_batch_id AND is_completed = false AND dismissed_at IS NULL
  );
END;
$$;

-- 8. Default log authorship
ALTER TABLE public.batch_logs ALTER COLUMN created_by_user_id SET DEFAULT auth.uid();

-- 9. Harden RLS UPDATE policies with WITH CHECK

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- kombucha_batches
DROP POLICY IF EXISTS "Users can update own batches" ON public.kombucha_batches;
CREATE POLICY "Users can update own batches" ON public.kombucha_batches
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- batch_logs
DROP POLICY IF EXISTS "Users can update own logs" ON public.batch_logs;
CREATE POLICY "Users can update own logs" ON public.batch_logs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_logs.batch_id AND kombucha_batches.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_logs.batch_id AND kombucha_batches.user_id = auth.uid()
  ));

-- batch_reminders
DROP POLICY IF EXISTS "Users can update own reminders" ON public.batch_reminders;
CREATE POLICY "Users can update own reminders" ON public.batch_reminders
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_reminders.batch_id AND kombucha_batches.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_reminders.batch_id AND kombucha_batches.user_id = auth.uid()
  ));

-- batch_notes
DROP POLICY IF EXISTS "Users can update own notes" ON public.batch_notes;
CREATE POLICY "Users can update own notes" ON public.batch_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_notes.batch_id AND kombucha_batches.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_notes.batch_id AND kombucha_batches.user_id = auth.uid()
  ));

-- batch_f2_setups
DROP POLICY IF EXISTS "Users can update own f2 setups" ON public.batch_f2_setups;
CREATE POLICY "Users can update own f2 setups" ON public.batch_f2_setups
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_f2_setups.batch_id AND kombucha_batches.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_f2_setups.batch_id AND kombucha_batches.user_id = auth.uid()
  ));

-- batch_bottles
DROP POLICY IF EXISTS "Users can update own bottles" ON public.batch_bottles;
CREATE POLICY "Users can update own bottles" ON public.batch_bottles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM batch_f2_setups s JOIN kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = batch_bottles.f2_setup_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM batch_f2_setups s JOIN kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = batch_bottles.f2_setup_id AND b.user_id = auth.uid()
  ));

-- assistant_conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can update own conversations" ON public.assistant_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. Photo update policy
DROP POLICY IF EXISTS "Users can update own photos" ON public.batch_photos;
CREATE POLICY "Users can update own photos" ON public.batch_photos
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_photos.batch_id AND kombucha_batches.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM kombucha_batches WHERE kombucha_batches.id = batch_photos.batch_id AND kombucha_batches.user_id = auth.uid()
  ));
