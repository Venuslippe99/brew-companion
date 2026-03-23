-- ============================================================
-- F1 Recipe and Setup Studio Phase 2
-- ============================================================

DO $$
BEGIN
  CREATE TYPE public.fermentation_vessel_material_enum AS ENUM (
    'glass',
    'ceramic_glazed_food_safe',
    'food_grade_plastic',
    'unknown_plastic',
    'stainless_steel',
    'reactive_metal',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.f1_vessel_suitability_enum AS ENUM (
    'recommended',
    'acceptable',
    'caution',
    'not_recommended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.f1_vessel_fit_state_enum AS ENUM (
    'roomy',
    'good_fit',
    'tight_fit',
    'overfilled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.fermentation_vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 150),
  material_type public.fermentation_vessel_material_enum NOT NULL,
  capacity_ml integer CHECK (capacity_ml IS NULL OR capacity_ml > 0),
  recommended_max_fill_ml integer CHECK (
    recommended_max_fill_ml IS NULL
    OR recommended_max_fill_ml > 0
  ),
  f1_suitability public.f1_vessel_suitability_enum NOT NULL DEFAULT 'recommended',
  notes text,
  is_favorite boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fermentation_vessels_fill_within_capacity CHECK (
    capacity_ml IS NULL
    OR recommended_max_fill_ml IS NULL
    OR recommended_max_fill_ml <= capacity_ml
  )
);

CREATE INDEX IF NOT EXISTS idx_fermentation_vessels_user
  ON public.fermentation_vessels(user_id);

CREATE INDEX IF NOT EXISTS idx_fermentation_vessels_user_archived
  ON public.fermentation_vessels(user_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_fermentation_vessels_user_updated
  ON public.fermentation_vessels(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_fermentation_vessels_updated_at ON public.fermentation_vessels;

CREATE TRIGGER update_fermentation_vessels_updated_at
  BEFORE UPDATE ON public.fermentation_vessels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.f1_recipes
  ADD COLUMN IF NOT EXISTS preferred_vessel_id uuid REFERENCES public.fermentation_vessels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_f1_recipes_preferred_vessel_id
  ON public.f1_recipes(preferred_vessel_id)
  WHERE preferred_vessel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_same_user_preferred_vessel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.preferred_vessel_id IS NOT NULL THEN
    PERFORM 1
    FROM public.fermentation_vessels v
    WHERE v.id = NEW.preferred_vessel_id
      AND v.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'preferred_vessel_id must reference a vessel owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_preferred_vessel ON public.f1_recipes;

CREATE TRIGGER trg_enforce_same_user_preferred_vessel
BEFORE INSERT OR UPDATE OF preferred_vessel_id, user_id
ON public.f1_recipes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_same_user_preferred_vessel();

CREATE TABLE IF NOT EXISTS public.batch_f1_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL UNIQUE REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  selected_recipe_id uuid REFERENCES public.f1_recipes(id) ON DELETE SET NULL,
  selected_vessel_id uuid REFERENCES public.fermentation_vessels(id) ON DELETE SET NULL,
  setup_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  fit_state public.f1_vessel_fit_state_enum,
  fit_notes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT batch_f1_setups_snapshot_is_object CHECK (jsonb_typeof(setup_snapshot_json) = 'object'),
  CONSTRAINT batch_f1_setups_fit_notes_is_object CHECK (jsonb_typeof(fit_notes_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_batch_f1_setups_recipe_id
  ON public.batch_f1_setups(selected_recipe_id)
  WHERE selected_recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_batch_f1_setups_vessel_id
  ON public.batch_f1_setups(selected_vessel_id)
  WHERE selected_vessel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_batch_f1_setups_user
  ON public.batch_f1_setups(created_by_user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_batch_f1_setups_updated_at ON public.batch_f1_setups;

CREATE TRIGGER update_batch_f1_setups_updated_at
  BEFORE UPDATE ON public.batch_f1_setups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_same_user_batch_f1_setup_refs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  batch_user_id uuid;
BEGIN
  SELECT b.user_id
  INTO batch_user_id
  FROM public.kombucha_batches b
  WHERE b.id = NEW.batch_id;

  IF batch_user_id IS NULL THEN
    RAISE EXCEPTION 'batch_id must reference an existing batch';
  END IF;

  IF NEW.created_by_user_id <> batch_user_id THEN
    RAISE EXCEPTION 'batch_f1_setups must be created by the same user who owns the batch';
  END IF;

  IF NEW.selected_recipe_id IS NOT NULL THEN
    PERFORM 1
    FROM public.f1_recipes r
    WHERE r.id = NEW.selected_recipe_id
      AND r.user_id = batch_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'selected_recipe_id must reference a recipe owned by the same user';
    END IF;
  END IF;

  IF NEW.selected_vessel_id IS NOT NULL THEN
    PERFORM 1
    FROM public.fermentation_vessels v
    WHERE v.id = NEW.selected_vessel_id
      AND v.user_id = batch_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'selected_vessel_id must reference a vessel owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_batch_f1_setup_refs ON public.batch_f1_setups;

CREATE TRIGGER trg_enforce_same_user_batch_f1_setup_refs
BEFORE INSERT OR UPDATE OF batch_id, selected_recipe_id, selected_vessel_id, created_by_user_id
ON public.batch_f1_setups
FOR EACH ROW
EXECUTE FUNCTION public.enforce_same_user_batch_f1_setup_refs();

ALTER TABLE public.fermentation_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_f1_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fermentation vessels"
ON public.fermentation_vessels
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fermentation vessels"
ON public.fermentation_vessels
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own fermentation vessels"
ON public.fermentation_vessels
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own fermentation vessels"
ON public.fermentation_vessels
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view own batch f1 setups"
ON public.batch_f1_setups
FOR SELECT TO authenticated
USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can insert own batch f1 setups"
ON public.batch_f1_setups
FOR INSERT TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update own batch f1 setups"
ON public.batch_f1_setups
FOR UPDATE TO authenticated
USING (created_by_user_id = auth.uid())
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can delete own batch f1 setups"
ON public.batch_f1_setups
FOR DELETE TO authenticated
USING (created_by_user_id = auth.uid());
