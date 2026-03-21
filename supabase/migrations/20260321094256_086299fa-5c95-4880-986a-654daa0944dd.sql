
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.experience_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.brewing_goal_enum AS ENUM ('sweeter', 'balanced', 'tart', 'stronger_carbonation', 'safer_guided');
CREATE TYPE public.batch_status_enum AS ENUM ('active', 'completed', 'archived', 'discarded');
CREATE TYPE public.batch_stage_enum AS ENUM ('f1_active', 'f1_check_window', 'f1_extended', 'f2_setup', 'f2_active', 'refrigerate_now', 'chilled_ready', 'completed', 'archived', 'discarded');
CREATE TYPE public.starter_source_type_enum AS ENUM ('manual', 'previous_batch');
CREATE TYPE public.caution_level_enum AS ENUM ('none', 'low', 'moderate', 'high', 'elevated');
CREATE TYPE public.log_type_enum AS ENUM ('taste_test', 'moved_to_f2', 'bottle_burped', 'refrigerated', 'temp_check', 'ph_check', 'sweetness_check', 'carbonation_check', 'custom_action', 'note_only', 'photo_added');
CREATE TYPE public.reminder_type_enum AS ENUM ('f1_taste_check', 'start_f2', 'burp_bottles', 'refrigerate_now', 'custom');
CREATE TYPE public.urgency_level_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.note_category_enum AS ENUM ('general', 'tasting', 'observation', 'final_review', 'warning');
CREATE TYPE public.bottle_type_enum AS ENUM ('swing_top', 'crown_cap', 'screw_cap', 'plastic_test_bottle', 'other');
CREATE TYPE public.ingredient_form_enum AS ENUM ('juice', 'puree', 'whole_fruit', 'syrup', 'herbs_spices', 'other');
CREATE TYPE public.desired_carbonation_enum AS ENUM ('light', 'balanced', 'strong');
CREATE TYPE public.flavour_category_enum AS ENUM ('berries', 'citrus', 'tropical', 'apple_pear', 'stone_fruit', 'ginger_spice', 'floral_herbal', 'syrup', 'other');
CREATE TYPE public.assistant_role_enum AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.guide_category_enum AS ENUM ('kombucha_basics', 'f1_process', 'starter_and_scoby', 'f2_flavouring', 'carbonation_and_bottling', 'readiness_and_tasting', 'common_mistakes', 'danger_signs', 'troubleshooting', 'cleaning_and_equipment');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- TABLES
-- ============================================================

-- 1. profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (char_length(display_name) <= 100),
  experience_level public.experience_level_enum NOT NULL DEFAULT 'beginner',
  brewing_goal public.brewing_goal_enum,
  prefers_guided_mode boolean NOT NULL DEFAULT true,
  dark_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. flavour_presets (global, created before batch_bottles references it)
CREATE TABLE public.flavour_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category public.flavour_category_enum NOT NULL,
  ingredient_form_supported jsonb NOT NULL DEFAULT '[]'::jsonb,
  sweetness_intensity integer NOT NULL CHECK (sweetness_intensity BETWEEN 1 AND 5),
  flavour_intensity integer NOT NULL CHECK (flavour_intensity BETWEEN 1 AND 5),
  suggested_min_per_500ml numeric(10,2) CHECK (suggested_min_per_500ml >= 0),
  suggested_max_per_500ml numeric(10,2),
  default_unit text NOT NULL,
  carbonation_tendency integer NOT NULL CHECK (carbonation_tendency BETWEEN 1 AND 5),
  caution_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flavour_presets_min_max CHECK (
    suggested_max_per_500ml IS NULL OR suggested_min_per_500ml IS NULL OR suggested_max_per_500ml >= suggested_min_per_500ml
  )
);

-- 3. guide_articles (global)
CREATE TABLE public.guide_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) > 0),
  category public.guide_category_enum NOT NULL,
  summary text,
  experience_level_relevance public.experience_level_enum,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. guide_sections
CREATE TABLE public.guide_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_article_id uuid NOT NULL REFERENCES public.guide_articles(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (char_length(section_type) > 0),
  title text NOT NULL CHECK (char_length(title) > 0),
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. kombucha_batches
CREATE TABLE public.kombucha_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 150),
  status public.batch_status_enum NOT NULL DEFAULT 'active',
  current_stage public.batch_stage_enum NOT NULL DEFAULT 'f1_active',
  batch_type text NOT NULL DEFAULT 'kombucha' CHECK (batch_type = 'kombucha'),
  brew_started_at timestamptz NOT NULL,
  total_volume_ml integer NOT NULL CHECK (total_volume_ml > 0),
  tea_type text NOT NULL CHECK (char_length(tea_type) > 0),
  sugar_g numeric(10,2) NOT NULL CHECK (sugar_g >= 0),
  starter_liquid_ml numeric(10,2) NOT NULL CHECK (starter_liquid_ml >= 0),
  starter_source_type public.starter_source_type_enum NOT NULL DEFAULT 'manual',
  starter_source_batch_id uuid REFERENCES public.kombucha_batches(id) ON DELETE SET NULL,
  scoby_present boolean NOT NULL DEFAULT true,
  avg_room_temp_c numeric(5,2) NOT NULL CHECK (avg_room_temp_c > 0 AND avg_room_temp_c < 60),
  vessel_type text,
  target_preference public.brewing_goal_enum,
  initial_ph numeric(4,2) CHECK (initial_ph IS NULL OR (initial_ph >= 0 AND initial_ph <= 14)),
  initial_notes text,
  cover_type text,
  tea_strength_notes text,
  starter_acidity_confidence text,
  brewing_method_notes text,
  initial_observations text,
  readiness_window_start timestamptz,
  readiness_window_end timestamptz,
  caution_level public.caution_level_enum NOT NULL DEFAULT 'none',
  next_action text,
  reminders_enabled boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  archived_at timestamptz,
  discarded_at timestamptz,
  discard_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_starter CHECK (starter_source_batch_id IS NULL OR starter_source_batch_id != id)
);

-- 6. batch_stage_events
CREATE TABLE public.batch_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  from_stage public.batch_stage_enum,
  to_stage public.batch_stage_enum NOT NULL,
  triggered_by text NOT NULL CHECK (char_length(triggered_by) > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. batch_logs
CREATE TABLE public.batch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  log_type public.log_type_enum NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  value_text text,
  value_number numeric(10,2),
  value_unit text,
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. batch_reminders
CREATE TABLE public.batch_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  reminder_type public.reminder_type_enum NOT NULL,
  title text NOT NULL CHECK (char_length(title) > 0),
  description text,
  due_at timestamptz NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  urgency_level public.urgency_level_enum NOT NULL DEFAULT 'medium',
  auto_generated boolean NOT NULL DEFAULT true,
  user_created boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. batch_notes
CREATE TABLE public.batch_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0),
  note_category public.note_category_enum NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. batch_photos
CREATE TABLE public.batch_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'batch-photos',
  storage_path text NOT NULL CHECK (char_length(storage_path) > 0),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  stage_at_upload public.batch_stage_enum,
  caption text,
  linked_log_id uuid REFERENCES public.batch_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. batch_f2_setups
CREATE TABLE public.batch_f2_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.kombucha_batches(id) ON DELETE CASCADE,
  setup_created_at timestamptz NOT NULL DEFAULT now(),
  bottle_count integer NOT NULL CHECK (bottle_count > 0),
  bottle_size_ml integer NOT NULL CHECK (bottle_size_ml > 0),
  bottle_type public.bottle_type_enum NOT NULL DEFAULT 'swing_top',
  avg_headspace_description text,
  ambient_temp_c numeric(5,2) NOT NULL CHECK (ambient_temp_c > 0 AND ambient_temp_c < 60),
  desired_carbonation_level public.desired_carbonation_enum NOT NULL DEFAULT 'balanced',
  flavouring_mode text,
  additional_sugar_total_g numeric(10,2) NOT NULL DEFAULT 0 CHECK (additional_sugar_total_g >= 0),
  burp_reminders_enabled boolean NOT NULL DEFAULT false,
  estimated_pressure_risk public.caution_level_enum NOT NULL DEFAULT 'none',
  suggested_first_check_at timestamptz,
  suggested_refrigerate_window_start timestamptz,
  suggested_refrigerate_window_end timestamptz,
  setup_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. batch_bottles
CREATE TABLE public.batch_bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  f2_setup_id uuid NOT NULL REFERENCES public.batch_f2_setups(id) ON DELETE CASCADE,
  bottle_label text,
  bottle_size_ml integer NOT NULL CHECK (bottle_size_ml > 0),
  flavour_preset_id uuid REFERENCES public.flavour_presets(id) ON DELETE SET NULL,
  custom_flavour_name text,
  ingredient_form public.ingredient_form_enum,
  ingredient_amount_value numeric(10,2) CHECK (ingredient_amount_value IS NULL OR ingredient_amount_value >= 0),
  ingredient_amount_unit text,
  extra_sugar_g numeric(10,2) NOT NULL DEFAULT 0 CHECK (extra_sugar_g >= 0),
  bottle_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. assistant_conversations
CREATE TABLE public.assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_batch_id uuid REFERENCES public.kombucha_batches(id) ON DELETE SET NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. assistant_messages
CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role public.assistant_role_enum NOT NULL,
  content text NOT NULL,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_experience ON public.profiles(experience_level);

-- flavour_presets
CREATE INDEX idx_flavour_presets_category ON public.flavour_presets(category);
CREATE INDEX idx_flavour_presets_active ON public.flavour_presets(is_active) WHERE is_active = true;

-- guide_articles
CREATE INDEX idx_guide_articles_category ON public.guide_articles(category);
CREATE INDEX idx_guide_articles_published ON public.guide_articles(is_published) WHERE is_published = true;

-- guide_sections
CREATE INDEX idx_guide_sections_article ON public.guide_sections(guide_article_id);
CREATE INDEX idx_guide_sections_sort ON public.guide_sections(guide_article_id, sort_order);

-- kombucha_batches
CREATE INDEX idx_batches_user ON public.kombucha_batches(user_id);
CREATE INDEX idx_batches_user_status ON public.kombucha_batches(user_id, status);
CREATE INDEX idx_batches_user_stage ON public.kombucha_batches(user_id, current_stage);
CREATE INDEX idx_batches_user_updated ON public.kombucha_batches(user_id, updated_at DESC);
CREATE INDEX idx_batches_starter_source ON public.kombucha_batches(starter_source_batch_id) WHERE starter_source_batch_id IS NOT NULL;

-- batch_stage_events
CREATE INDEX idx_stage_events_batch ON public.batch_stage_events(batch_id);
CREATE INDEX idx_stage_events_batch_time ON public.batch_stage_events(batch_id, created_at DESC);

-- batch_logs
CREATE INDEX idx_logs_batch ON public.batch_logs(batch_id);
CREATE INDEX idx_logs_batch_time ON public.batch_logs(batch_id, logged_at DESC);
CREATE INDEX idx_logs_type ON public.batch_logs(log_type);
CREATE INDEX idx_logs_payload ON public.batch_logs USING GIN (structured_payload);

-- batch_reminders
CREATE INDEX idx_reminders_batch ON public.batch_reminders(batch_id);
CREATE INDEX idx_reminders_batch_due ON public.batch_reminders(batch_id, due_at);
CREATE INDEX idx_reminders_incomplete_due ON public.batch_reminders(is_completed, due_at) WHERE is_completed = false;
CREATE INDEX idx_reminders_urgency ON public.batch_reminders(urgency_level);

-- batch_notes
CREATE INDEX idx_notes_batch ON public.batch_notes(batch_id);
CREATE INDEX idx_notes_category ON public.batch_notes(note_category);

-- batch_photos
CREATE INDEX idx_photos_batch ON public.batch_photos(batch_id);
CREATE INDEX idx_photos_batch_time ON public.batch_photos(batch_id, uploaded_at DESC);
CREATE INDEX idx_photos_log ON public.batch_photos(linked_log_id) WHERE linked_log_id IS NOT NULL;

-- batch_f2_setups
CREATE INDEX idx_f2_setups_batch ON public.batch_f2_setups(batch_id);
CREATE INDEX idx_f2_setups_time ON public.batch_f2_setups(setup_created_at DESC);

-- batch_bottles
CREATE INDEX idx_bottles_setup ON public.batch_bottles(f2_setup_id);
CREATE INDEX idx_bottles_preset ON public.batch_bottles(flavour_preset_id) WHERE flavour_preset_id IS NOT NULL;

-- assistant_conversations
CREATE INDEX idx_conversations_user ON public.assistant_conversations(user_id);
CREATE INDEX idx_conversations_batch ON public.assistant_conversations(linked_batch_id) WHERE linked_batch_id IS NOT NULL;
CREATE INDEX idx_conversations_user_updated ON public.assistant_conversations(user_id, updated_at DESC);

-- assistant_messages
CREATE INDEX idx_messages_conversation ON public.assistant_messages(conversation_id);
CREATE INDEX idx_messages_conversation_time ON public.assistant_messages(conversation_id, created_at);
CREATE INDEX idx_messages_snapshot ON public.assistant_messages USING GIN (context_snapshot);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.kombucha_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.batch_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.batch_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_f2_setups_updated_at BEFORE UPDATE ON public.batch_f2_setups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bottles_updated_at BEFORE UPDATE ON public.batch_bottles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flavour_presets_updated_at BEFORE UPDATE ON public.flavour_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guide_articles_updated_at BEFORE UPDATE ON public.guide_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guide_sections_updated_at BEFORE UPDATE ON public.guide_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.assistant_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_batch_day_number(p_brew_started_at timestamptz)
RETURNS integer AS $$
BEGIN
  RETURN GREATEST(1, EXTRACT(DAY FROM (now() - p_brew_started_at))::integer + 1);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_batch_overdue_count(p_batch_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer FROM public.batch_reminders
    WHERE batch_id = p_batch_id AND is_completed = false AND dismissed_at IS NULL AND due_at < now()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_batch_active_reminder_count(p_batch_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer FROM public.batch_reminders
    WHERE batch_id = p_batch_id AND is_completed = false AND dismissed_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.batch_dashboard_view AS
SELECT
  b.id,
  b.user_id,
  b.name,
  b.status,
  b.current_stage,
  b.brew_started_at,
  public.get_batch_day_number(b.brew_started_at) AS day_number,
  b.readiness_window_start,
  b.readiness_window_end,
  b.caution_level,
  b.next_action,
  public.get_batch_overdue_count(b.id) AS overdue_reminder_count,
  public.get_batch_active_reminder_count(b.id) AS active_reminder_count,
  (SELECT max(logged_at) FROM public.batch_logs WHERE batch_id = b.id) AS latest_log_at,
  (SELECT max(uploaded_at) FROM public.batch_photos WHERE batch_id = b.id) AS latest_photo_at,
  b.avg_room_temp_c,
  b.tea_type,
  b.updated_at
FROM public.kombucha_batches b;

CREATE OR REPLACE VIEW public.batch_timeline_view AS
SELECT id, batch_id, 'stage_event' AS event_type, created_at AS event_at,
  ('Stage → ' || to_stage::text) AS title, reason AS subtitle, jsonb_build_object('from', from_stage, 'to', to_stage, 'triggered_by', triggered_by) AS payload
FROM public.batch_stage_events
UNION ALL
SELECT id, batch_id, 'log' AS event_type, logged_at AS event_at,
  log_type::text AS title, note AS subtitle, structured_payload AS payload
FROM public.batch_logs
UNION ALL
SELECT id, batch_id, 'note' AS event_type, created_at AS event_at,
  note_category::text AS title, left(body, 120) AS subtitle, jsonb_build_object('body', body) AS payload
FROM public.batch_notes
UNION ALL
SELECT id, batch_id, 'photo' AS event_type, uploaded_at AS event_at,
  COALESCE(caption, 'Photo') AS title, stage_at_upload::text AS subtitle, jsonb_build_object('storage_path', storage_path) AS payload
FROM public.batch_photos
UNION ALL
SELECT id, batch_id, 'reminder_completed' AS event_type, completed_at AS event_at,
  title, description AS subtitle, jsonb_build_object('reminder_type', reminder_type, 'urgency', urgency_level) AS payload
FROM public.batch_reminders WHERE is_completed = true AND completed_at IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kombucha_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_f2_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavour_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_sections ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- kombucha_batches
CREATE POLICY "Users can view own batches" ON public.kombucha_batches FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own batches" ON public.kombucha_batches FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own batches" ON public.kombucha_batches FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own batches" ON public.kombucha_batches FOR DELETE TO authenticated USING (user_id = auth.uid());

-- batch_stage_events (child of batch)
CREATE POLICY "Users can view own stage events" ON public.batch_stage_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own stage events" ON public.batch_stage_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own stage events" ON public.batch_stage_events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_logs
CREATE POLICY "Users can view own logs" ON public.batch_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own logs" ON public.batch_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own logs" ON public.batch_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own logs" ON public.batch_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_reminders
CREATE POLICY "Users can view own reminders" ON public.batch_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own reminders" ON public.batch_reminders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own reminders" ON public.batch_reminders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own reminders" ON public.batch_reminders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_notes
CREATE POLICY "Users can view own notes" ON public.batch_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own notes" ON public.batch_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own notes" ON public.batch_notes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own notes" ON public.batch_notes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_photos
CREATE POLICY "Users can view own photos" ON public.batch_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own photos" ON public.batch_photos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own photos" ON public.batch_photos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_f2_setups
CREATE POLICY "Users can view own f2 setups" ON public.batch_f2_setups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own f2 setups" ON public.batch_f2_setups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own f2 setups" ON public.batch_f2_setups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own f2 setups" ON public.batch_f2_setups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kombucha_batches WHERE id = batch_id AND user_id = auth.uid()));

-- batch_bottles (child of f2_setup, which is child of batch)
CREATE POLICY "Users can view own bottles" ON public.batch_bottles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batch_f2_setups s JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own bottles" ON public.batch_bottles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.batch_f2_setups s JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own bottles" ON public.batch_bottles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batch_f2_setups s JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own bottles" ON public.batch_bottles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batch_f2_setups s JOIN public.kombucha_batches b ON b.id = s.batch_id
    WHERE s.id = f2_setup_id AND b.user_id = auth.uid()
  ));

-- assistant_conversations
CREATE POLICY "Users can view own conversations" ON public.assistant_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own conversations" ON public.assistant_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON public.assistant_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own conversations" ON public.assistant_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- assistant_messages (child of conversation)
CREATE POLICY "Users can view own messages" ON public.assistant_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assistant_conversations WHERE id = conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own messages" ON public.assistant_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_conversations WHERE id = conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own messages" ON public.assistant_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assistant_conversations WHERE id = conversation_id AND user_id = auth.uid()));

-- global readable: flavour_presets
CREATE POLICY "Anyone can view active presets" ON public.flavour_presets FOR SELECT TO authenticated USING (is_active = true);

-- global readable: guide_articles
CREATE POLICY "Anyone can view published guides" ON public.guide_articles FOR SELECT TO authenticated USING (is_published = true);

-- global readable: guide_sections
CREATE POLICY "Anyone can view guide sections" ON public.guide_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guide_articles WHERE id = guide_article_id AND is_published = true));

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('batch-photos', 'batch-photos', false);

CREATE POLICY "Users can upload own batch photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'batch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own batch photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'batch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own batch photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'batch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SEED DATA: FLAVOUR PRESETS
-- ============================================================

INSERT INTO public.flavour_presets (name, category, ingredient_form_supported, sweetness_intensity, flavour_intensity, suggested_min_per_500ml, suggested_max_per_500ml, default_unit, carbonation_tendency, caution_notes) VALUES
('Raspberry', 'berries', '["whole_fruit","puree","juice"]', 3, 4, 30, 60, 'g', 4, 'High sugar and pulp content. Can build pressure quickly, especially as puree. Burp recommended.'),
('Strawberry', 'berries', '["whole_fruit","puree","juice"]', 4, 3, 30, 60, 'g', 3, 'Moderate carbonation. Puree can clog narrow bottle necks.'),
('Blueberry', 'berries', '["whole_fruit","puree","juice"]', 3, 3, 25, 50, 'g', 3, 'Moderate sugar. Can stain. Good all-round berry choice.'),
('Lemon Juice', 'citrus', '["juice"]', 1, 5, 10, 25, 'ml', 2, 'Very low sugar contribution. Mainly adds tartness and brightness. Low pressure risk.'),
('Orange Juice', 'citrus', '["juice"]', 3, 3, 20, 40, 'ml', 3, 'Moderate sugar from juice. Fresh squeezed has more pulp and variable sugar.'),
('Apple', 'apple_pear', '["juice","whole_fruit"]', 3, 3, 20, 50, 'ml', 3, 'Apple juice is a reliable, mild F2 base. Monitor sugar content of juice used.'),
('Mango', 'tropical', '["puree","whole_fruit","juice"]', 5, 4, 20, 50, 'g', 4, 'Very high sugar. Can generate strong carbonation. Burp early and often. Consider less sugar addition.'),
('Pineapple', 'tropical', '["juice","whole_fruit"]', 4, 5, 15, 35, 'ml', 5, 'Very active fermentation due to high sugar and enzymes. High pressure risk. Burp frequently. Refrigerate earlier than usual.'),
('Ginger', 'ginger_spice', '["juice","whole_fruit"]', 1, 5, 5, 20, 'g', 2, 'Adds heat and spice with minimal sugar. Grate fresh for strongest flavour. Low pressure from ginger alone.'),
('Hibiscus Syrup', 'syrup', '["syrup"]', 4, 4, 10, 25, 'ml', 3, 'Concentrated sugar source. Use sparingly. Beautiful colour. Monitor carbonation with syrup additions.'),
('Mint', 'floral_herbal', '["herbs_spices"]', 1, 3, 3, 8, 'g', 1, 'No sugar contribution. Adds freshness. Use fresh leaves. Remove before long storage to avoid bitterness.'),
('Basil', 'floral_herbal', '["herbs_spices"]', 1, 2, 3, 8, 'g', 1, 'No sugar contribution. Subtle herbal flavour. Pairs well with fruit like strawberry or lemon. Remove before long storage.');

-- ============================================================
-- SEED DATA: GUIDE ARTICLES AND SECTIONS
-- ============================================================

INSERT INTO public.guide_articles (slug, title, category, summary) VALUES
('kombucha-basics', 'Kombucha Basics', 'kombucha_basics', 'Everything you need to know about kombucha, what it is, how it works, and why people brew it at home.'),
('f1-process', 'The F1 Fermentation Process', 'f1_process', 'A complete guide to first fermentation — from sweet tea to tangy kombucha.'),
('starter-liquid-and-scoby', 'Starter Liquid and SCOBY', 'starter_and_scoby', 'Understanding your SCOBY, starter liquid, and how to keep your culture healthy.'),
('f2-flavouring', 'F2 Flavouring Guide', 'f2_flavouring', 'How to add fruits, herbs, and spices during second fermentation for delicious flavoured kombucha.'),
('carbonation-and-bottling', 'Carbonation and Bottling', 'carbonation_and_bottling', 'Safe bottling practices, carbonation science, and how to get fizzy kombucha without accidents.'),
('readiness-and-tasting', 'Readiness and Tasting', 'readiness_and_tasting', 'How to tell when your kombucha is ready — taste tests, visual cues, and pH guidance.'),
('common-mistakes', 'Common Mistakes', 'common_mistakes', 'The most frequent beginner errors and how to avoid them for better brews.'),
('danger-signs', 'Danger Signs and When to Discard', 'danger_signs', 'How to identify contamination, mould, and unsafe conditions. When in doubt, throw it out.'),
('troubleshooting', 'Troubleshooting', 'troubleshooting', 'Solutions for common problems: too sweet, too sour, no carbonation, odd smells, and more.'),
('cleaning-and-equipment', 'Cleaning and Equipment Basics', 'cleaning_and_equipment', 'Choosing vessels, bottles, and tools — plus how to clean and sanitise properly.');

-- Kombucha Basics sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'What is Kombucha?', 'Kombucha is a fermented tea drink made by adding a symbiotic culture of bacteria and yeast (SCOBY) to sweetened tea. The culture consumes the sugar and produces organic acids, carbon dioxide, and trace alcohol, resulting in a tangy, slightly effervescent beverage. Home brewing gives you full control over flavour, sweetness, and carbonation.', 1 FROM public.guide_articles WHERE slug = 'kombucha-basics'
UNION ALL
SELECT id, 'ingredients', 'What You Need', 'Tea (black, green, or a blend), white sugar (most reliable), filtered water, a SCOBY, and starter liquid from a previous batch or a trusted source. You also need a wide-mouth glass jar, a breathable cover (cloth or coffee filter), and a rubber band.', 2 FROM public.guide_articles WHERE slug = 'kombucha-basics'
UNION ALL
SELECT id, 'process', 'The Two-Stage Process', 'Kombucha brewing has two main stages. F1 (first fermentation) is where sweet tea becomes kombucha over 7–14 days. F2 (second fermentation) is an optional stage where you bottle the kombucha with fruit or flavourings to develop carbonation and flavour, typically 2–4 days.', 3 FROM public.guide_articles WHERE slug = 'kombucha-basics'
UNION ALL
SELECT id, 'safety', 'Safety First', 'Kombucha is generally safe when brewed in clean conditions with a healthy culture. Always use clean equipment, watch for signs of mould (fuzzy, coloured patches on top), and never consume a batch that smells rotten or looks contaminated. When in doubt, discard and start fresh.', 4 FROM public.guide_articles WHERE slug = 'kombucha-basics';

-- F1 Process sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Understanding F1', 'First fermentation (F1) is the core brewing stage. You combine cooled sweet tea with starter liquid and your SCOBY, then let it ferment at room temperature for 7–14 days. During this time the culture converts sugar into acids, giving kombucha its characteristic tang.', 1 FROM public.guide_articles WHERE slug = 'f1-process'
UNION ALL
SELECT id, 'steps', 'Step by Step', '1. Brew strong sweet tea (roughly 1 cup sugar per gallon). 2. Cool completely to room temperature. 3. Pour into your fermentation vessel. 4. Add starter liquid (10–15% of total volume). 5. Place SCOBY on top. 6. Cover with breathable cloth and secure. 7. Place in a warm spot (21–29°C) away from direct sunlight. 8. Wait and taste-test from day 5–7 onwards.', 2 FROM public.guide_articles WHERE slug = 'f1-process'
UNION ALL
SELECT id, 'tips', 'Temperature Matters', 'Warmer rooms (25–29°C) speed up fermentation. Cooler rooms (18–22°C) slow it down. Extremely cold rooms may stall fermentation. Use a thermometer and try to keep conditions consistent. Large temperature swings can stress the culture.', 3 FROM public.guide_articles WHERE slug = 'f1-process'
UNION ALL
SELECT id, 'mistakes', 'Common F1 Mistakes', 'Using tea that is too hot (kills the culture), not enough starter liquid (pH too high, inviting mould), fermenting in direct sunlight, using antibacterial soap on equipment, or metal vessels that react with the acidic liquid.', 4 FROM public.guide_articles WHERE slug = 'f1-process';

-- Starter Liquid and SCOBY sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'The Living Culture', 'Your SCOBY (Symbiotic Culture of Bacteria and Yeast) is the engine of kombucha brewing. The rubbery disc you see is actually a cellulose mat produced by the bacteria. The real magic is in the liquid surrounding it — the starter liquid — which contains the active microorganisms.', 1 FROM public.guide_articles WHERE slug = 'starter-liquid-and-scoby'
UNION ALL
SELECT id, 'guide', 'Starter Liquid Essentials', 'Always reserve 1–2 cups of unflavoured kombucha from your previous batch as starter for the next. This acidic liquid lowers the pH of your fresh sweet tea, creating a safe environment. Without enough starter, the brew is vulnerable to mould and bad bacteria. A pH of 4.5 or below at the start is ideal.', 2 FROM public.guide_articles WHERE slug = 'starter-liquid-and-scoby'
UNION ALL
SELECT id, 'tips', 'SCOBY Health', 'A healthy SCOBY can be white, cream, or tan. It may look bumpy or smooth. Brown stringy bits (yeast strands) hanging underneath are normal. Mould appears as fuzzy patches — usually blue, green, black, or white — growing on top of the SCOBY above the liquid line. Mould means discard everything.', 3 FROM public.guide_articles WHERE slug = 'starter-liquid-and-scoby';

-- F2 Flavouring sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Why Flavour in F2?', 'Second fermentation is where kombucha transforms from a plain tangy tea into a flavoured, carbonated drink. By adding fruit, juice, herbs, or spices to sealed bottles, you trap CO₂ produced by continued fermentation, creating natural fizz while infusing flavour.', 1 FROM public.guide_articles WHERE slug = 'f2-flavouring'
UNION ALL
SELECT id, 'guide', 'Choosing Ingredients', 'Fresh fruit, fruit juice, purees, ginger, herbs, and edible flowers all work. High-sugar fruits (mango, pineapple, grapes) create more carbonation but also more pressure risk. Low-sugar additions (herbs, lemon juice, ginger) add flavour with less pressure. Start conservatively and adjust next time.', 2 FROM public.guide_articles WHERE slug = 'f2-flavouring'
UNION ALL
SELECT id, 'safety', 'Pressure Caution', 'Sealed bottles build pressure. Over-carbonation can cause bottles to burst — this is a real safety risk. Use pressure-rated bottles (swing-top or thick glass), leave headspace, and burp bottles daily for the first few days if using high-sugar fruits. Refrigerate promptly when carbonation feels right.', 3 FROM public.guide_articles WHERE slug = 'f2-flavouring';

-- Carbonation and Bottling sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Getting the Fizz Right', 'Carbonation in kombucha comes from CO₂ produced during fermentation. In F2, sealing the bottles traps this gas, dissolving it into the liquid. The amount of carbonation depends on residual sugar, added sugar/fruit, temperature, and time.', 1 FROM public.guide_articles WHERE slug = 'carbonation-and-bottling'
UNION ALL
SELECT id, 'guide', 'Bottling Best Practices', 'Use swing-top glass bottles rated for carbonation. Leave 1–2 inches of headspace. Fill bottles evenly. Keep at room temperature for 2–4 days, then refrigerate. Cold slows fermentation dramatically, locking in your desired carbonation level.', 2 FROM public.guide_articles WHERE slug = 'carbonation-and-bottling'
UNION ALL
SELECT id, 'safety', 'Avoiding Bottle Bombs', 'Never use thin glass, decorative bottles, or mason jars for carbonated F2. Burp bottles daily if using high-sugar additions. Use a plastic test bottle alongside glass — when the plastic bottle is firm, your glass bottles are likely ready to refrigerate. Always open bottles over a sink.', 3 FROM public.guide_articles WHERE slug = 'carbonation-and-bottling';

-- Readiness and Tasting sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'When is it Ready?', 'There is no single perfect moment. Readiness is subjective — it depends on your taste preference. Kombucha transitions from sweet to tart over time. The goal of tasting is to catch it at your preferred balance.', 1 FROM public.guide_articles WHERE slug = 'readiness-and-tasting'
UNION ALL
SELECT id, 'guide', 'How to Taste Test', 'Use a clean straw or spoon to draw a small sample from beneath the SCOBY. Taste for sweetness, tartness, and depth. If it is still very sweet, let it ferment longer. If it is too tart, you have gone too far — use it as starter or blend with fresh juice. Aim to check every 1–2 days once you enter the check window.', 2 FROM public.guide_articles WHERE slug = 'readiness-and-tasting'
UNION ALL
SELECT id, 'tips', 'Using pH as a Guide', 'pH is a helpful supplementary measurement. Finished kombucha typically lands between 2.5 and 3.5. A pH meter is more accurate than strips. However, pH alone does not tell you about flavour — always combine pH with taste testing.', 3 FROM public.guide_articles WHERE slug = 'readiness-and-tasting';

-- Common Mistakes sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Learning from Mistakes', 'Most kombucha mistakes are recoverable. The key is recognising what went wrong and adjusting. Here are the most common issues new brewers encounter.', 1 FROM public.guide_articles WHERE slug = 'common-mistakes'
UNION ALL
SELECT id, 'list', 'Top Mistakes', '1. Not enough starter liquid — raises pH, invites mould. 2. Tea too hot when adding SCOBY — kills the culture. 3. Using antibacterial soap — residue inhibits fermentation. 4. Fermenting in direct sunlight — degrades the culture. 5. Not tasting regularly — brew goes too sour. 6. Using flavoured tea with oils — inhibits culture health. 7. Skipping the cloth cover — fruit flies contaminate the brew. 8. Adding fruit during F1 — use F2 for flavouring.', 2 FROM public.guide_articles WHERE slug = 'common-mistakes';

-- Danger Signs sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Safety is Non-Negotiable', 'Kombucha brewing is generally safe, but contamination does happen. Knowing what to look for protects you and anyone you share your brew with. The golden rule: when in doubt, throw it out.', 1 FROM public.guide_articles WHERE slug = 'danger-signs'
UNION ALL
SELECT id, 'list', 'When to Discard', '1. Visible mould on the SCOBY surface (fuzzy, coloured patches above the liquid line). 2. Strong rotten or chemical smell (distinct from normal vinegary tang). 3. Fruit flies or larvae in the brew. 4. Black discolouration of the SCOBY (not brown yeast — actual black). 5. Brew does not acidify after 2+ weeks despite warm conditions. 6. Any visible foreign contamination. Never try to scrape off mould and continue — the entire batch is compromised.', 2 FROM public.guide_articles WHERE slug = 'danger-signs'
UNION ALL
SELECT id, 'safety', 'Bottle Pressure Danger', 'Over-carbonated bottles can shatter. If a bottle hisses aggressively when cracked open, or if liquid shoots out, refrigerate all remaining bottles immediately. If you suspect extreme pressure, open bottles wrapped in a towel, pointed away from you, over a sink.', 3 FROM public.guide_articles WHERE slug = 'danger-signs';

-- Troubleshooting sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Solving Common Problems', 'Most issues have simple explanations. Here are solutions for the most frequent troubleshooting questions.', 1 FROM public.guide_articles WHERE slug = 'troubleshooting'
UNION ALL
SELECT id, 'faq', 'Troubleshooting FAQ', 'Too sweet after 14 days? Room may be too cold — move to a warmer spot. Too sour? Fermented too long — shorten next time or use as starter. No carbonation in F2? Not enough sugar or fruit, bottles not sealed properly, or room too cold. Vinegary smell? Normal if strong — your brew went too far into vinegar territory. Thin or no new SCOBY forming? Often caused by cold temperatures, disturbing the vessel, or weak starter.', 2 FROM public.guide_articles WHERE slug = 'troubleshooting';

-- Cleaning and Equipment sections
INSERT INTO public.guide_sections (guide_article_id, section_type, title, body, sort_order)
SELECT id, 'overview', 'Clean Equipment, Better Brews', 'Cleanliness is the foundation of safe kombucha brewing. You do not need to sterilise like in beer brewing, but you do need to be clean and avoid chemicals that harm the culture.', 1 FROM public.guide_articles WHERE slug = 'cleaning-and-equipment'
UNION ALL
SELECT id, 'guide', 'Equipment Essentials', 'Wide-mouth glass jar (1–5 gallon), breathable cloth cover, rubber bands, swing-top glass bottles for F2, pH strips or a pH meter, a thermometer, and a dedicated brewing spoon (wood or food-grade plastic). Avoid metal vessels for fermentation — stainless steel is acceptable for brief contact.', 2 FROM public.guide_articles WHERE slug = 'cleaning-and-equipment'
UNION ALL
SELECT id, 'tips', 'Cleaning Best Practices', 'Wash all equipment with hot water and plain white vinegar. Avoid antibacterial soap, bleach, and scented detergents — residues can inhibit or kill your culture. Rinse thoroughly. Between batches, rinse your vessel with hot water and a splash of distilled white vinegar.', 3 FROM public.guide_articles WHERE slug = 'cleaning-and-equipment';
