-- ============================================================
-- F1 Recipe and Setup Studio Phase 3
-- Explainable recommendation snapshots
-- ============================================================

ALTER TABLE public.batch_f1_setups
  ADD COLUMN IF NOT EXISTS recommendation_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.batch_f1_setups
  ADD COLUMN IF NOT EXISTS recommendation_engine_version text;

ALTER TABLE public.batch_f1_setups
  ADD COLUMN IF NOT EXISTS accepted_recommendation_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.batch_f1_setups
  DROP CONSTRAINT IF EXISTS batch_f1_setups_recommendation_snapshot_is_object;

ALTER TABLE public.batch_f1_setups
  ADD CONSTRAINT batch_f1_setups_recommendation_snapshot_is_object
  CHECK (jsonb_typeof(recommendation_snapshot_json) = 'object');

ALTER TABLE public.batch_f1_setups
  DROP CONSTRAINT IF EXISTS batch_f1_setups_accepted_recommendation_ids_is_array;

ALTER TABLE public.batch_f1_setups
  ADD CONSTRAINT batch_f1_setups_accepted_recommendation_ids_is_array
  CHECK (jsonb_typeof(accepted_recommendation_ids_json) = 'array');
