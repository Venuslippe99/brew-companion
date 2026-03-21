-- ============================================================
-- KOMBLOOM SCHEMA HARDENING
-- ============================================================
-- This migration hardens integrity, RLS, JSON validation,
-- stage history logging, and F2 consistency.
-- Do not modify old migrations. Add this as a new migration only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. HARDEN JSON SHAPES
-- ------------------------------------------------------------

ALTER TABLE public.batch_logs
  ADD CONSTRAINT batch_logs_structured_payload_is_object
  CHECK (jsonb_typeof(structured_payload) = 'object');

ALTER TABLE public.assistant_messages
  ADD CONSTRAINT assistant_messages_context_snapshot_is_object
  CHECK (jsonb_typeof(context_snapshot) = 'object');

ALTER TABLE public.flavour_presets
  ADD CONSTRAINT flavour_presets_ingredient_form_supported_is_array
  CHECK (jsonb_typeof(ingredient_form_supported) = 'array');


-- ------------------------------------------------------------
-- 2. HARDEN KOMBUCHA BATCH LIFECYCLE CONSISTENCY
-- ------------------------------------------------------------

ALTER TABLE public.kombucha_batches
  ADD CONSTRAINT kombucha_batches_starter_source_consistency
  CHECK (
    (starter_source_type = 'manual' AND starter_source_batch_id IS NULL)
    OR
    (starter_source_type = 'previous_batch' AND starter_source_batch_id IS NOT NULL)
  );

ALTER TABLE public.kombucha_batches
  ADD CONSTRAINT kombucha_batches_status_stage_consistency
  CHECK (
    (
      status = 'active'
      AND current_stage NOT IN ('completed', 'archived', 'discarded')
      AND completed_at IS NULL
      AND archived_at IS NULL
      AND discarded_at IS NULL
    )
    OR
    (
      status = 'completed'
      AND current_stage = 'completed'
      AND completed_at IS NOT NULL
      AND archived_at IS NULL
      AND discarded_at IS NULL
    )
    OR
    (
      status = 'archived'
      AND current_stage = 'archived'
      AND archived_at IS NOT NULL
      AND completed_at IS NULL
      AND discarded_at IS NULL
    )
    OR
    (
      status = 'discarded'
      AND current_stage = 'discarded'
      AND discarded_at IS NOT NULL
      AND completed_at IS NULL
      AND archived_at IS NULL
    )
  );


-- ------------------------------------------------------------
-- 3. HARDEN LOG VALUE VALIDATION
-- ------------------------------------------------------------

ALTER TABLE public.batch_logs
  ADD CONSTRAINT batch_logs_ph_range
  CHECK (
    log_type <> 'ph_check'
    OR value_number IS NULL
    OR (value_number >= 0 AND value_number <= 14)
  );

ALTER TABLE public.batch_logs
  ADD CONSTRAINT batch_logs_temp_range
  CHECK (
    log_type <> 'temp_check'
    OR value_number IS NULL
    OR (
      (
        value_unit IS NULL
        AND value_number BETWEEN -5 AND 60
      )
      OR (
        lower(value_unit) IN ('c', 'celsius', '°c')
        AND value_number BETWEEN -5 AND 60
      )
      OR (
        lower(value_unit) IN ('f', 'fahrenheit', '°f')
        AND value_number BETWEEN 23 AND 140
      )
    )
  );


-- ------------------------------------------------------------
-- 4. F2 HARDENING
-- ------------------------------------------------------------

ALTER TABLE public.batch_f2_setups
  ADD COLUMN is_current boolean NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY batch_id
      ORDER BY setup_created_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.batch_f2_setups
)
UPDATE public.batch_f2_setups s
SET is_current = CASE WHEN r.rn = 1 THEN true ELSE false END
FROM ranked r
WHERE r.id = s.id;

CREATE UNIQUE INDEX idx_batch_f2_setups_one_current_per_batch
  ON public.batch_f2_setups(batch_id)
  WHERE is_current = true;

ALTER TABLE public.batch_bottles
  ADD CONSTRAINT batch_bottles_nonblank_label
  CHECK (bottle_label IS NULL OR btrim(bottle_label) <> '');

CREATE UNIQUE INDEX idx_batch_bottles_unique_label_per_setup
  ON public.batch_bottles(f2_setup_id, lower(bottle_label))
  WHERE bottle_label IS NOT NULL AND btrim(bottle_label) <> '';


-- ------------------------------------------------------------
-- 5. SAME USER REFERENCE SAFETY
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_same_user_starter_batch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.starter_source_batch_id IS NOT NULL THEN
    PERFORM 1
    FROM public.kombucha_batches src
    WHERE src.id = NEW.starter_source_batch_id
      AND src.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'starter_source_batch_id must reference a batch owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_starter_batch ON public.kombucha_batches;

CREATE TRIGGER trg_enforce_same_user_starter_batch
BEFORE INSERT OR UPDATE OF starter_source_batch_id, user_id
ON public.kombucha_batches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_same_user_starter_batch();


CREATE OR REPLACE FUNCTION public.enforce_same_user_linked_batch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_batch_id IS NOT NULL THEN
    PERFORM 1
    FROM public.kombucha_batches b
    WHERE b.id = NEW.linked_batch_id
      AND b.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'linked_batch_id must reference a batch owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_linked_batch ON public.assistant_conversations;

CREATE TRIGGER trg_enforce_same_user_linked_batch
BEFORE INSERT OR UPDATE OF linked_batch_id, user_id
ON public.assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_same_user_linked_batch();


-- ------------------------------------------------------------
-- 6. STAGE HISTORY AUTOMATION
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_initial_batch_stage_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.batch_stage_events (
    batch_id,
    from_stage,
    to_stage,
    triggered_by,
    reason,
    created_at
  )
  VALUES (
    NEW.id,
    NULL,
    NEW.current_stage,
    COALESCE(auth.uid()::text, 'system'),
    'initial batch creation',
    COALESCE(NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_initial_batch_stage_event ON public.kombucha_batches;

CREATE TRIGGER trg_log_initial_batch_stage_event
AFTER INSERT ON public.kombucha_batches
FOR EACH ROW
EXECUTE FUNCTION public.log_initial_batch_stage_event();


CREATE OR REPLACE FUNCTION public.log_batch_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    INSERT INTO public.batch_stage_events (
      batch_id,
      from_stage,
      to_stage,
      triggered_by,
      reason,
      created_at
    )
    VALUES (
      NEW.id,
      OLD.current_stage,
      NEW.current_stage,
      COALESCE(auth.uid()::text, 'system'),
      'batch stage changed',
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_batch_stage_change ON public.kombucha_batches;

CREATE TRIGGER trg_log_batch_stage_change
AFTER UPDATE OF current_stage ON public.kombucha_batches
FOR EACH ROW
EXECUTE FUNCTION public.log_batch_stage_change();


INSERT INTO public.batch_stage_events (
  batch_id,
  from_stage,
  to_stage,
  triggered_by,
  reason,
  created_at
)
SELECT
  b.id,
  NULL,
  b.current_stage,
  'system',
  'backfilled initial stage event',
  b.created_at
FROM public.kombucha_batches b
WHERE NOT EXISTS (
  SELECT 1
  FROM public.batch_stage_events e
  WHERE e.batch_id = b.id
);


-- ------------------------------------------------------------
-- 7. REMOVE SECURITY DEFINER RISK FROM COUNT FUNCTIONS
-- ------------------------------------------------------------

ALTER FUNCTION public.get_batch_overdue_count(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_batch_active_reminder_count(uuid) SECURITY INVOKER;


-- ------------------------------------------------------------
-- 8. LOCK DOWN created_by_user_id ON LOGS
-- ------------------------------------------------------------

ALTER TABLE public.batch_logs
  ALTER COLUMN created_by_user_id SET DEFAULT auth.uid();


-- ------------------------------------------------------------
-- 9. RLS HARDENING
-- Important: update policies should have WITH CHECK, not only USING.
-- ------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- kombucha_batches
DROP POLICY IF EXISTS "Users can update own batches" ON public.kombucha_batches;
CREATE POLICY "Users can update own batches"
ON public.kombucha_batches
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- batch_logs
DROP POLICY IF EXISTS "Users can insert own logs" ON public.batch_logs;
CREATE POLICY "Users can insert own logs"
ON public.batch_logs
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own logs" ON public.batch_logs;
CREATE POLICY "Users can update own logs"
ON public.batch_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);

-- batch_reminders
DROP POLICY IF EXISTS "Users can update own reminders" ON public.batch_reminders;
CREATE POLICY "Users can update own reminders"
ON public.batch_reminders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);

-- batch_notes
DROP POLICY IF EXISTS "Users can update own notes" ON public.batch_notes;
CREATE POLICY "Users can update own notes"
ON public.batch_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);

-- batch_f2_setups
DROP POLICY IF EXISTS "Users can update own f2 setups" ON public.batch_f2_setups;
CREATE POLICY "Users can update own f2 setups"
ON public.batch_f2_setups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);

-- batch_bottles
DROP POLICY IF EXISTS "Users can update own bottles" ON public.batch_bottles;
CREATE POLICY "Users can update own bottles"
ON public.batch_bottles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.batch_f2_setups s
    JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.batch_f2_setups s
    JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id
      AND b.user_id = auth.uid()
  )
);

-- assistant_conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can update own conversations"
ON public.assistant_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ------------------------------------------------------------
-- 10. OPTIONAL BUT USEFUL: allow caption edits on photos
-- This was not in your original schema, but it is practical.
-- ------------------------------------------------------------

CREATE POLICY "Users can update own photos"
ON public.batch_photos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.kombucha_batches b
    WHERE b.id = batch_id
      AND b.user_id = auth.uid()
  )
);
