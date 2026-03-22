ALTER TABLE public.kombucha_batches
  ADD COLUMN IF NOT EXISTS brew_again_source_batch_id uuid
  REFERENCES public.kombucha_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_brew_again_source
  ON public.kombucha_batches(brew_again_source_batch_id)
  WHERE brew_again_source_batch_id IS NOT NULL;
