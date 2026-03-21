
-- Fix security definer views by recreating with security_invoker = true

CREATE OR REPLACE VIEW public.batch_dashboard_view
WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.batch_timeline_view
WITH (security_invoker = true) AS
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
