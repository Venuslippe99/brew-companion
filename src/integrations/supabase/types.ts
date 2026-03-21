export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assistant_conversations: {
        Row: {
          created_at: string
          id: string
          linked_batch_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          
        }
        Insert: {
          created_at?: string
          id?: string
          linked_batch_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          
        }
        Update: {
          created_at?: string
          id?: string
          linked_batch_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_linked_batch_id_fkey"
            columns: ["linked_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_linked_batch_id_fkey"
            columns: ["linked_batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          context_snapshot: Json
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["assistant_role_enum"]
        }
        Insert: {
          content: string
          context_snapshot?: Json
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["assistant_role_enum"]
        }
        Update: {
          content?: string
          context_snapshot?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["assistant_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_bottles: {
        Row: {
          bottle_label: string | null
          bottle_notes: string | null
          bottle_size_ml: number
          created_at: string
          custom_flavour_name: string | null
          extra_sugar_g: number
          f2_setup_id: string
          flavour_preset_id: string | null
          id: string
          ingredient_amount_unit: string | null
          ingredient_amount_value: number | null
          ingredient_form:
            | Database["public"]["Enums"]["ingredient_form_enum"]
            | null
          updated_at: string
        }
        Insert: {
          bottle_label?: string | null
          bottle_notes?: string | null
          bottle_size_ml: number
          created_at?: string
          custom_flavour_name?: string | null
          extra_sugar_g?: number
          f2_setup_id: string
          flavour_preset_id?: string | null
          id?: string
          ingredient_amount_unit?: string | null
          ingredient_amount_value?: number | null
          ingredient_form?:
            | Database["public"]["Enums"]["ingredient_form_enum"]
            | null
          updated_at?: string
        }
        Update: {
          bottle_label?: string | null
          bottle_notes?: string | null
          bottle_size_ml?: number
          created_at?: string
          custom_flavour_name?: string | null
          extra_sugar_g?: number
          f2_setup_id?: string
          flavour_preset_id?: string | null
          id?: string
          ingredient_amount_unit?: string | null
          ingredient_amount_value?: number | null
          ingredient_form?:
            | Database["public"]["Enums"]["ingredient_form_enum"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_bottles_f2_setup_id_fkey"
            columns: ["f2_setup_id"]
            isOneToOne: false
            referencedRelation: "batch_f2_setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_bottles_flavour_preset_id_fkey"
            columns: ["flavour_preset_id"]
            isOneToOne: false
            referencedRelation: "flavour_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_f2_setups: {
        Row: {
          additional_sugar_total_g: number
          ambient_temp_c: number
          avg_headspace_description: string | null
          batch_id: string
          bottle_count: number
          bottle_size_ml: number
          bottle_type: Database["public"]["Enums"]["bottle_type_enum"]
          burp_reminders_enabled: boolean
          created_at: string
          desired_carbonation_level: Database["public"]["Enums"]["desired_carbonation_enum"]
          estimated_pressure_risk: Database["public"]["Enums"]["caution_level_enum"]
          flavouring_mode: string | null
          id: string
          is_current: boolean
          setup_created_at: string
          setup_notes: string | null
          suggested_first_check_at: string | null
          suggested_refrigerate_window_end: string | null
          suggested_refrigerate_window_start: string | null
          updated_at: string
        }
        Insert: {
          additional_sugar_total_g?: number
          ambient_temp_c: number
          avg_headspace_description?: string | null
          batch_id: string
          bottle_count: number
          bottle_size_ml: number
          bottle_type?: Database["public"]["Enums"]["bottle_type_enum"]
          burp_reminders_enabled?: boolean
          created_at?: string
          desired_carbonation_level?: Database["public"]["Enums"]["desired_carbonation_enum"]
          estimated_pressure_risk?: Database["public"]["Enums"]["caution_level_enum"]
          flavouring_mode?: string | null
          id?: string
          is_current?: boolean
          setup_created_at?: string
          setup_notes?: string | null
          suggested_first_check_at?: string | null
          suggested_refrigerate_window_end?: string | null
          suggested_refrigerate_window_start?: string | null
          updated_at?: string
        }
        Update: {
          additional_sugar_total_g?: number
          ambient_temp_c?: number
          avg_headspace_description?: string | null
          batch_id?: string
          bottle_count?: number
          bottle_size_ml?: number
          bottle_type?: Database["public"]["Enums"]["bottle_type_enum"]
          burp_reminders_enabled?: boolean
          created_at?: string
          desired_carbonation_level?: Database["public"]["Enums"]["desired_carbonation_enum"]
          estimated_pressure_risk?: Database["public"]["Enums"]["caution_level_enum"]
          flavouring_mode?: string | null
          id?: string
          is_current?: boolean
          setup_created_at?: string
          setup_notes?: string | null
          suggested_first_check_at?: string | null
          suggested_refrigerate_window_end?: string | null
          suggested_refrigerate_window_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_f2_setups_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_f2_setups_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_logs: {
        Row: {
          batch_id: string
          created_at: string
          created_by_user_id: string
          id: string
          log_type: Database["public"]["Enums"]["log_type_enum"]
          logged_at: string
          note: string | null
          structured_payload: Json
          value_number: number | null
          value_text: string | null
          value_unit: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          log_type: Database["public"]["Enums"]["log_type_enum"]
          logged_at?: string
          note?: string | null
          structured_payload?: Json
          value_number?: number | null
          value_text?: string | null
          value_unit?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["log_type_enum"]
          logged_at?: string
          note?: string | null
          structured_payload?: Json
          value_number?: number | null
          value_text?: string | null
          value_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_notes: {
        Row: {
          batch_id: string
          body: string
          created_at: string
          id: string
          note_category: Database["public"]["Enums"]["note_category_enum"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          body: string
          created_at?: string
          id?: string
          note_category?: Database["public"]["Enums"]["note_category_enum"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          body?: string
          created_at?: string
          id?: string
          note_category?: Database["public"]["Enums"]["note_category_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_notes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_notes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_photos: {
        Row: {
          batch_id: string
          caption: string | null
          created_at: string
          id: string
          linked_log_id: string | null
          stage_at_upload:
            | Database["public"]["Enums"]["batch_stage_enum"]
            | null
          storage_bucket: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          batch_id: string
          caption?: string | null
          created_at?: string
          id?: string
          linked_log_id?: string | null
          stage_at_upload?:
            | Database["public"]["Enums"]["batch_stage_enum"]
            | null
          storage_bucket?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          batch_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          linked_log_id?: string | null
          stage_at_upload?:
            | Database["public"]["Enums"]["batch_stage_enum"]
            | null
          storage_bucket?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_photos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_photos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_photos_linked_log_id_fkey"
            columns: ["linked_log_id"]
            isOneToOne: false
            referencedRelation: "batch_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_reminders: {
        Row: {
          auto_generated: boolean
          batch_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          dismissed_at: string | null
          due_at: string
          id: string
          is_completed: boolean
          reminder_type: Database["public"]["Enums"]["reminder_type_enum"]
          title: string
          updated_at: string
          urgency_level: Database["public"]["Enums"]["urgency_level_enum"]
          user_created: boolean
        }
        Insert: {
          auto_generated?: boolean
          batch_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          due_at: string
          id?: string
          is_completed?: boolean
          reminder_type: Database["public"]["Enums"]["reminder_type_enum"]
          title: string
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level_enum"]
          user_created?: boolean
        }
        Update: {
          auto_generated?: boolean
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          due_at?: string
          id?: string
          is_completed?: boolean
          reminder_type?: Database["public"]["Enums"]["reminder_type_enum"]
          title?: string
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level_enum"]
          user_created?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "batch_reminders_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_reminders_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_stage_events: {
        Row: {
          batch_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["batch_stage_enum"] | null
          id: string
          reason: string | null
          to_stage: Database["public"]["Enums"]["batch_stage_enum"]
          triggered_by: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["batch_stage_enum"] | null
          id?: string
          reason?: string | null
          to_stage: Database["public"]["Enums"]["batch_stage_enum"]
          triggered_by: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["batch_stage_enum"] | null
          id?: string
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["batch_stage_enum"]
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_stage_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_stage_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      flavour_presets: {
        Row: {
          carbonation_tendency: number
          category: Database["public"]["Enums"]["flavour_category_enum"]
          caution_notes: string | null
          created_at: string
          default_unit: string
          flavour_intensity: number
          id: string
          ingredient_form_supported: Json
          is_active: boolean
          name: string
          suggested_max_per_500ml: number | null
          suggested_min_per_500ml: number | null
          sweetness_intensity: number
          updated_at: string
        }
        Insert: {
          carbonation_tendency: number
          category: Database["public"]["Enums"]["flavour_category_enum"]
          caution_notes?: string | null
          created_at?: string
          default_unit: string
          flavour_intensity: number
          id?: string
          ingredient_form_supported?: Json
          is_active?: boolean
          name: string
          suggested_max_per_500ml?: number | null
          suggested_min_per_500ml?: number | null
          sweetness_intensity: number
          updated_at?: string
        }
        Update: {
          carbonation_tendency?: number
          category?: Database["public"]["Enums"]["flavour_category_enum"]
          caution_notes?: string | null
          created_at?: string
          default_unit?: string
          flavour_intensity?: number
          id?: string
          ingredient_form_supported?: Json
          is_active?: boolean
          name?: string
          suggested_max_per_500ml?: number | null
          suggested_min_per_500ml?: number | null
          sweetness_intensity?: number
          updated_at?: string
        }
        Relationships: []
      }
      guide_articles: {
        Row: {
          category: Database["public"]["Enums"]["guide_category_enum"]
          created_at: string
          experience_level_relevance:
            | Database["public"]["Enums"]["experience_level_enum"]
            | null
          id: string
          is_published: boolean
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["guide_category_enum"]
          created_at?: string
          experience_level_relevance?:
            | Database["public"]["Enums"]["experience_level_enum"]
            | null
          id?: string
          is_published?: boolean
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["guide_category_enum"]
          created_at?: string
          experience_level_relevance?:
            | Database["public"]["Enums"]["experience_level_enum"]
            | null
          id?: string
          is_published?: boolean
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guide_sections: {
        Row: {
          body: string
          created_at: string
          guide_article_id: string
          id: string
          section_type: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          guide_article_id: string
          id?: string
          section_type: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          guide_article_id?: string
          id?: string
          section_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_sections_guide_article_id_fkey"
            columns: ["guide_article_id"]
            isOneToOne: false
            referencedRelation: "guide_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kombucha_batches: {
        Row: {
          archived_at: string | null
          avg_room_temp_c: number
          batch_type: string
          brew_started_at: string
          brewing_method_notes: string | null
          caution_level: Database["public"]["Enums"]["caution_level_enum"]
          completed_at: string | null
          cover_type: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["batch_stage_enum"]
          discard_reason: string | null
          discarded_at: string | null
          id: string
          initial_notes: string | null
          initial_observations: string | null
          initial_ph: number | null
          name: string
          next_action: string | null
          readiness_window_end: string | null
          readiness_window_start: string | null
          reminders_enabled: boolean
          scoby_present: boolean
          starter_acidity_confidence: string | null
          starter_liquid_ml: number
          starter_source_batch_id: string | null
          starter_source_type: Database["public"]["Enums"]["starter_source_type_enum"]
          status: Database["public"]["Enums"]["batch_status_enum"]
          sugar_g: number
          target_preference:
            | Database["public"]["Enums"]["brewing_goal_enum"]
            | null
          tea_strength_notes: string | null
          tea_type: string
          total_volume_ml: number
          updated_at: string
          user_id: string
          vessel_type: string | null
        }
        Insert: {
          archived_at?: string | null
          avg_room_temp_c: number
          batch_type?: string
          brew_started_at: string
          brewing_method_notes?: string | null
          caution_level?: Database["public"]["Enums"]["caution_level_enum"]
          completed_at?: string | null
          cover_type?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["batch_stage_enum"]
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          initial_notes?: string | null
          initial_observations?: string | null
          initial_ph?: number | null
          name: string
          next_action?: string | null
          readiness_window_end?: string | null
          readiness_window_start?: string | null
          reminders_enabled?: boolean
          scoby_present?: boolean
          starter_acidity_confidence?: string | null
          starter_liquid_ml: number
          starter_source_batch_id?: string | null
          starter_source_type?: Database["public"]["Enums"]["starter_source_type_enum"]
          status?: Database["public"]["Enums"]["batch_status_enum"]
          sugar_g: number
          target_preference?:
            | Database["public"]["Enums"]["brewing_goal_enum"]
            | null
          tea_strength_notes?: string | null
          tea_type: string
          total_volume_ml: number
          updated_at?: string
          user_id: string
          vessel_type?: string | null
        }
        Update: {
          archived_at?: string | null
          avg_room_temp_c?: number
          batch_type?: string
          brew_started_at?: string
          brewing_method_notes?: string | null
          caution_level?: Database["public"]["Enums"]["caution_level_enum"]
          completed_at?: string | null
          cover_type?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["batch_stage_enum"]
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          initial_notes?: string | null
          initial_observations?: string | null
          initial_ph?: number | null
          name?: string
          next_action?: string | null
          readiness_window_end?: string | null
          readiness_window_start?: string | null
          reminders_enabled?: boolean
          scoby_present?: boolean
          starter_acidity_confidence?: string | null
          starter_liquid_ml?: number
          starter_source_batch_id?: string | null
          starter_source_type?: Database["public"]["Enums"]["starter_source_type_enum"]
          status?: Database["public"]["Enums"]["batch_status_enum"]
          sugar_g?: number
          target_preference?:
            | Database["public"]["Enums"]["brewing_goal_enum"]
            | null
          tea_strength_notes?: string | null
          tea_type?: string
          total_volume_ml?: number
          updated_at?: string
          user_id?: string
          vessel_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kombucha_batches_starter_source_batch_id_fkey"
            columns: ["starter_source_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_dashboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kombucha_batches_starter_source_batch_id_fkey"
            columns: ["starter_source_batch_id"]
            isOneToOne: false
            referencedRelation: "kombucha_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brewing_goal: Database["public"]["Enums"]["brewing_goal_enum"] | null
          created_at: string
          dark_mode: boolean
          display_name: string | null
          experience_level: Database["public"]["Enums"]["experience_level_enum"]
          id: string
          prefers_guided_mode: boolean
          updated_at: string
          f2_started_at: string | null
        }
        Insert: {
          brewing_goal?: Database["public"]["Enums"]["brewing_goal_enum"] | null
          created_at?: string
          dark_mode?: boolean
          display_name?: string | null
          experience_level?: Database["public"]["Enums"]["experience_level_enum"]
          id: string
          prefers_guided_mode?: boolean
          updated_at?: string
          f2_started_at?: string | null
        }
        Update: {
          brewing_goal?: Database["public"]["Enums"]["brewing_goal_enum"] | null
          created_at?: string
          dark_mode?: boolean
          display_name?: string | null
          experience_level?: Database["public"]["Enums"]["experience_level_enum"]
          id?: string
          prefers_guided_mode?: boolean
          updated_at?: string
          f2_started_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      batch_dashboard_view: {
        Row: {
          active_reminder_count: number | null
          avg_room_temp_c: number | null
          brew_started_at: string | null
          caution_level:
            | Database["public"]["Enums"]["caution_level_enum"]
            | null
          current_stage: Database["public"]["Enums"]["batch_stage_enum"] | null
          day_number: number | null
          id: string | null
          latest_log_at: string | null
          latest_photo_at: string | null
          name: string | null
          next_action: string | null
          overdue_reminder_count: number | null
          readiness_window_end: string | null
          readiness_window_start: string | null
          status: Database["public"]["Enums"]["batch_status_enum"] | null
          tea_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_reminder_count?: never
          avg_room_temp_c?: number | null
          brew_started_at?: string | null
          caution_level?:
            | Database["public"]["Enums"]["caution_level_enum"]
            | null
          current_stage?: Database["public"]["Enums"]["batch_stage_enum"] | null
          day_number?: never
          id?: string | null
          latest_log_at?: never
          latest_photo_at?: never
          name?: string | null
          next_action?: string | null
          overdue_reminder_count?: never
          readiness_window_end?: string | null
          readiness_window_start?: string | null
          status?: Database["public"]["Enums"]["batch_status_enum"] | null
          tea_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_reminder_count?: never
          avg_room_temp_c?: number | null
          brew_started_at?: string | null
          caution_level?:
            | Database["public"]["Enums"]["caution_level_enum"]
            | null
          current_stage?: Database["public"]["Enums"]["batch_stage_enum"] | null
          day_number?: never
          id?: string | null
          latest_log_at?: never
          latest_photo_at?: never
          name?: string | null
          next_action?: string | null
          overdue_reminder_count?: never
          readiness_window_end?: string | null
          readiness_window_start?: string | null
          status?: Database["public"]["Enums"]["batch_status_enum"] | null
          tea_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_timeline_view: {
        Row: {
          batch_id: string | null
          event_at: string | null
          event_type: string | null
          id: string | null
          payload: Json | null
          subtitle: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_batch_active_reminder_count: {
        Args: { p_batch_id: string }
        Returns: number
      }
      get_batch_day_number: {
        Args: { p_brew_started_at: string }
        Returns: number
      }
      get_batch_overdue_count: { Args: { p_batch_id: string }; Returns: number }
    }
    Enums: {
      assistant_role_enum: "user" | "assistant" | "system"
      batch_stage_enum:
        | "f1_active"
        | "f1_check_window"
        | "f1_extended"
        | "f2_setup"
        | "f2_active"
        | "refrigerate_now"
        | "chilled_ready"
        | "completed"
        | "archived"
        | "discarded"
      batch_status_enum: "active" | "completed" | "archived" | "discarded"
      bottle_type_enum:
        | "swing_top"
        | "crown_cap"
        | "screw_cap"
        | "plastic_test_bottle"
        | "other"
      brewing_goal_enum:
        | "sweeter"
        | "balanced"
        | "tart"
        | "stronger_carbonation"
        | "safer_guided"
      caution_level_enum: "none" | "low" | "moderate" | "high" | "elevated"
      desired_carbonation_enum: "light" | "balanced" | "strong"
      experience_level_enum: "beginner" | "intermediate" | "advanced"
      flavour_category_enum:
        | "berries"
        | "citrus"
        | "tropical"
        | "apple_pear"
        | "stone_fruit"
        | "ginger_spice"
        | "floral_herbal"
        | "syrup"
        | "other"
      guide_category_enum:
        | "kombucha_basics"
        | "f1_process"
        | "starter_and_scoby"
        | "f2_flavouring"
        | "carbonation_and_bottling"
        | "readiness_and_tasting"
        | "common_mistakes"
        | "danger_signs"
        | "troubleshooting"
        | "cleaning_and_equipment"
      ingredient_form_enum:
        | "juice"
        | "puree"
        | "whole_fruit"
        | "syrup"
        | "herbs_spices"
        | "other"
      log_type_enum:
        | "taste_test"
        | "moved_to_f2"
        | "bottle_burped"
        | "refrigerated"
        | "temp_check"
        | "ph_check"
        | "sweetness_check"
        | "carbonation_check"
        | "custom_action"
        | "note_only"
        | "photo_added"
      note_category_enum:
        | "general"
        | "tasting"
        | "observation"
        | "final_review"
        | "warning"
      reminder_type_enum:
        | "f1_taste_check"
        | "start_f2"
        | "burp_bottles"
        | "refrigerate_now"
        | "custom"
      starter_source_type_enum: "manual" | "previous_batch"
      urgency_level_enum: "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assistant_role_enum: ["user", "assistant", "system"],
      batch_stage_enum: [
        "f1_active",
        "f1_check_window",
        "f1_extended",
        "f2_setup",
        "f2_active",
        "refrigerate_now",
        "chilled_ready",
        "completed",
        "archived",
        "discarded",
      ],
      batch_status_enum: ["active", "completed", "archived", "discarded"],
      bottle_type_enum: [
        "swing_top",
        "crown_cap",
        "screw_cap",
        "plastic_test_bottle",
        "other",
      ],
      brewing_goal_enum: [
        "sweeter",
        "balanced",
        "tart",
        "stronger_carbonation",
        "safer_guided",
      ],
      caution_level_enum: ["none", "low", "moderate", "high", "elevated"],
      desired_carbonation_enum: ["light", "balanced", "strong"],
      experience_level_enum: ["beginner", "intermediate", "advanced"],
      flavour_category_enum: [
        "berries",
        "citrus",
        "tropical",
        "apple_pear",
        "stone_fruit",
        "ginger_spice",
        "floral_herbal",
        "syrup",
        "other",
      ],
      guide_category_enum: [
        "kombucha_basics",
        "f1_process",
        "starter_and_scoby",
        "f2_flavouring",
        "carbonation_and_bottling",
        "readiness_and_tasting",
        "common_mistakes",
        "danger_signs",
        "troubleshooting",
        "cleaning_and_equipment",
      ],
      ingredient_form_enum: [
        "juice",
        "puree",
        "whole_fruit",
        "syrup",
        "herbs_spices",
        "other",
      ],
      log_type_enum: [
        "taste_test",
        "moved_to_f2",
        "bottle_burped",
        "refrigerated",
        "temp_check",
        "ph_check",
        "sweetness_check",
        "carbonation_check",
        "custom_action",
        "note_only",
        "photo_added",
      ],
      note_category_enum: [
        "general",
        "tasting",
        "observation",
        "final_review",
        "warning",
      ],
      reminder_type_enum: [
        "f1_taste_check",
        "start_f2",
        "burp_bottles",
        "refrigerate_now",
        "custom",
      ],
      starter_source_type_enum: ["manual", "previous_batch"],
      urgency_level_enum: ["low", "medium", "high", "critical"],
    },
  },
} as const
