ALTER TABLE public.batch_f2_bottle_groups
  ADD COLUMN IF NOT EXISTS recipe_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS selected_recipe_id uuid REFERENCES public.f2_recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guided_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recipe_name_snapshot text,
  ADD COLUMN IF NOT EXISTS recipe_description_snapshot text,
  ADD COLUMN IF NOT EXISTS recipe_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.batch_f2_bottle_groups
  DROP CONSTRAINT IF EXISTS batch_f2_bottle_groups_recipe_mode_check;

ALTER TABLE public.batch_f2_bottle_groups
  ADD CONSTRAINT batch_f2_bottle_groups_recipe_mode_check
  CHECK (recipe_mode IN ('none', 'saved', 'preset', 'custom'));

CREATE INDEX IF NOT EXISTS idx_batch_f2_bottle_groups_selected_recipe
  ON public.batch_f2_bottle_groups(selected_recipe_id)
  WHERE selected_recipe_id IS NOT NULL;

ALTER TABLE public.batch_bottles
  ADD COLUMN IF NOT EXISTS f2_bottle_group_id uuid REFERENCES public.batch_f2_bottle_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batch_bottles_group_id
  ON public.batch_bottles(f2_bottle_group_id)
  WHERE f2_bottle_group_id IS NOT NULL;

UPDATE public.batch_f2_bottle_groups g
SET
  recipe_mode = CASE
    WHEN s.selected_recipe_id IS NULL
      AND (s.recipe_snapshot_json IS NULL OR s.recipe_snapshot_json = '{}'::jsonb)
      THEN 'none'
    WHEN COALESCE(r.is_preset, false) = true
      THEN 'preset'
    WHEN s.selected_recipe_id IS NOT NULL
      THEN 'saved'
    ELSE 'custom'
  END,
  selected_recipe_id = s.selected_recipe_id,
  guided_mode = COALESCE(
    (s.recipe_snapshot_json ->> 'guidedMode')::boolean,
    CASE WHEN s.flavouring_mode = 'advanced' THEN false ELSE true END
  ),
  recipe_name_snapshot = COALESCE(s.recipe_name_snapshot, NULLIF(s.recipe_snapshot_json ->> 'recipeName', '')),
  recipe_description_snapshot = NULLIF(s.recipe_snapshot_json ->> 'recipeDescription', ''),
  recipe_snapshot_json = COALESCE(s.recipe_snapshot_json, '{}'::jsonb)
FROM public.batch_f2_setups s
LEFT JOIN public.f2_recipes r
  ON r.id = s.selected_recipe_id
WHERE g.f2_setup_id = s.id;
