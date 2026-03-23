-- ============================================================
-- F1 Recipe and Setup Studio Phase 1
-- ============================================================

CREATE TABLE public.f1_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 150),
  description text,
  target_total_volume_ml integer NOT NULL CHECK (target_total_volume_ml > 0),
  tea_type text NOT NULL CHECK (char_length(btrim(tea_type)) > 0),
  tea_source_form text NOT NULL CHECK (tea_source_form IN ('tea_bags', 'loose_leaf', 'other')),
  tea_amount_value numeric(10,2) NOT NULL CHECK (tea_amount_value >= 0),
  tea_amount_unit text NOT NULL CHECK (tea_amount_unit IN ('bags', 'g', 'tbsp', 'tsp')),
  sugar_type text NOT NULL CHECK (char_length(btrim(sugar_type)) > 0),
  sugar_amount_value numeric(10,2) NOT NULL CHECK (sugar_amount_value >= 0),
  sugar_amount_unit text NOT NULL CHECK (sugar_amount_unit IN ('g')),
  default_starter_liquid_ml numeric(10,2) NOT NULL CHECK (default_starter_liquid_ml >= 0),
  default_scoby_present boolean NOT NULL DEFAULT true,
  target_preference public.brewing_goal_enum,
  default_room_temp_c numeric(5,2) CHECK (default_room_temp_c IS NULL OR (default_room_temp_c > 0 AND default_room_temp_c < 60)),
  default_notes text,
  is_favorite boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_f1_recipes_user ON public.f1_recipes(user_id);
CREATE INDEX idx_f1_recipes_user_archived ON public.f1_recipes(user_id, archived_at);
CREATE INDEX idx_f1_recipes_user_updated ON public.f1_recipes(user_id, updated_at DESC);

CREATE TRIGGER update_f1_recipes_updated_at
  BEFORE UPDATE ON public.f1_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kombucha_batches
  ADD COLUMN IF NOT EXISTS f1_recipe_id uuid REFERENCES public.f1_recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tea_source_form text,
  ADD COLUMN IF NOT EXISTS tea_amount_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS tea_amount_unit text,
  ADD COLUMN IF NOT EXISTS sugar_type text;

ALTER TABLE public.kombucha_batches
  DROP CONSTRAINT IF EXISTS kombucha_batches_tea_source_form_valid;

ALTER TABLE public.kombucha_batches
  ADD CONSTRAINT kombucha_batches_tea_source_form_valid
  CHECK (
    tea_source_form IS NULL
    OR tea_source_form IN ('tea_bags', 'loose_leaf', 'other')
  );

ALTER TABLE public.kombucha_batches
  DROP CONSTRAINT IF EXISTS kombucha_batches_tea_amount_unit_valid;

ALTER TABLE public.kombucha_batches
  ADD CONSTRAINT kombucha_batches_tea_amount_unit_valid
  CHECK (
    tea_amount_unit IS NULL
    OR tea_amount_unit IN ('bags', 'g', 'tbsp', 'tsp')
  );

CREATE INDEX IF NOT EXISTS idx_batches_f1_recipe_id
  ON public.kombucha_batches(f1_recipe_id)
  WHERE f1_recipe_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_same_user_f1_recipe()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.f1_recipe_id IS NOT NULL THEN
    PERFORM 1
    FROM public.f1_recipes r
    WHERE r.id = NEW.f1_recipe_id
      AND r.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'f1_recipe_id must reference a recipe owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_user_f1_recipe ON public.kombucha_batches;

CREATE TRIGGER trg_enforce_same_user_f1_recipe
BEFORE INSERT OR UPDATE OF f1_recipe_id, user_id
ON public.kombucha_batches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_same_user_f1_recipe();

ALTER TABLE public.f1_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own f1 recipes"
ON public.f1_recipes
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own f1 recipes"
ON public.f1_recipes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own f1 recipes"
ON public.f1_recipes
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own f1 recipes"
ON public.f1_recipes
FOR DELETE TO authenticated
USING (user_id = auth.uid());
