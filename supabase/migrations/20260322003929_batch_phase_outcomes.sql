CREATE TYPE public.phase_outcome_phase_enum AS ENUM ('f1', 'f2');
CREATE TYPE public.f1_taste_state_enum AS ENUM ('too_sweet', 'slightly_sweet', 'balanced', 'tart', 'too_sour');
CREATE TYPE public.f1_readiness_enum AS ENUM ('yes', 'maybe_early', 'maybe_late', 'no');
CREATE TYPE public.f2_overall_result_enum AS ENUM ('excellent', 'good', 'okay', 'disappointing', 'bad');
CREATE TYPE public.f2_brew_again_enum AS ENUM ('yes', 'maybe_with_changes', 'no');

ALTER TYPE public.log_type_enum ADD VALUE IF NOT EXISTS 'phase_outcome';

CREATE TABLE public.batch_phase_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  phase public.phase_outcome_phase_enum NOT NULL,
  selected_tags text[] NOT NULL DEFAULT '{}',
  note text,
  next_time_change text,
  f1_taste_state public.f1_taste_state_enum,
  f1_readiness public.f1_readiness_enum,
  f2_overall_result public.f2_overall_result_enum,
  f2_brew_again public.f2_brew_again_enum,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT batch_phase_outcomes_one_per_phase UNIQUE (batch_id, phase),
  CONSTRAINT batch_phase_outcomes_selected_tags_limit CHECK (cardinality(selected_tags) <= 2),
  CONSTRAINT batch_phase_outcomes_selected_tags_nonblank CHECK (
    NOT EXISTS (
      SELECT 1
      FROM unnest(selected_tags) AS tag
      WHERE length(trim(tag)) = 0
    )
  ),
  CONSTRAINT batch_phase_outcomes_phase_fields CHECK (
    CASE
      WHEN phase = 'f1' THEN
        f1_taste_state IS NOT NULL
        AND f1_readiness IS NOT NULL
        AND f2_overall_result IS NULL
        AND f2_brew_again IS NULL
      WHEN phase = 'f2' THEN
        f2_overall_result IS NOT NULL
        AND f2_brew_again IS NOT NULL
        AND f1_taste_state IS NULL
        AND f1_readiness IS NULL
      ELSE false
    END
  )
);

CREATE INDEX idx_batch_phase_outcomes_batch ON public.batch_phase_outcomes(batch_id);
CREATE INDEX idx_batch_phase_outcomes_phase ON public.batch_phase_outcomes(phase);
CREATE INDEX idx_batch_phase_outcomes_updated ON public.batch_phase_outcomes(updated_at DESC);

CREATE TRIGGER update_batch_phase_outcomes_updated_at
  BEFORE UPDATE ON public.batch_phase_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.batch_phase_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phase outcomes" ON public.batch_phase_outcomes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.kombucha_batches
      WHERE id = batch_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own phase outcomes" ON public.batch_phase_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.kombucha_batches
      WHERE id = batch_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own phase outcomes" ON public.batch_phase_outcomes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.kombucha_batches
      WHERE id = batch_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.kombucha_batches
      WHERE id = batch_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own phase outcomes" ON public.batch_phase_outcomes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.kombucha_batches
      WHERE id = batch_id AND user_id = auth.uid()
    )
  );
