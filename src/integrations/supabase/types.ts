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
      agents: {
        Row: {
          after_hours_behavior: string
          after_hours_voicemail_message: string | null
          agent_name: string
          agent_title: string | null
          amd_action: string
          amd_enabled: boolean
          answer_after_rings: number
          background_noise: string
          backup_transfer_number: string | null
          business_hours: Json
          call_direction: string
          call_objective: string
          cloned_voice_id: string | null
          closing_script: string | null
          company_name_override: string | null
          compiled_system_prompt: string | null
          consent_script: string | null
          conversation_stages: Json
          cooloff_days_not_interested: number
          created_at: string
          delay_between_calls_seconds: number
          description: string | null
          disclosure_script: string | null
          disclosure_timing: string
          enthusiasm_level: number
          fallback_cta: string | null
          faq_pairs: Json | null
          filler_words_enabled: boolean
          greeting_script: string
          hours_between_retries: number
          id: string
          if_no_human: string
          inbound_greeting: string | null
          industry: string | null
          interruption_handling: string
          knowledge_base_text: string | null
          knowledge_base_urls: string[] | null
          language: string
          max_attempts_per_contact: number
          max_call_duration_minutes: number
          max_calls_per_contact_per_day: number
          max_concurrent_calls: number
          objection_handling: Json
          play_disclosure: boolean
          post_call_email_body: string | null
          post_call_email_enabled: boolean
          post_call_email_subject: string | null
          post_call_email_trigger: string
          post_call_notification_email: string | null
          post_call_notification_enabled: boolean
          post_call_notification_includes: Json
          post_call_notification_triggers: Json
          post_call_sms_body: string | null
          post_call_sms_enabled: boolean
          post_call_task_enabled: boolean
          primary_cta: string
          record_calls: boolean
          require_verbal_consent: boolean
          respect_dnc: boolean
          silence_timeout_seconds: number
          speaking_speed: number
          status: string
          success_rate: number | null
          tenant_id: string
          timezone: string
          tone: string
          total_calls: number
          transfer_announcement: string | null
          transfer_method: string
          transfer_phone_number: string | null
          transfer_timeout_seconds: number
          transfer_triggers: Json
          updated_at: string
          vapi_assistant_id: string | null
          vapi_last_synced_at: string | null
          vapi_sync_error: string | null
          vapi_sync_status: string
          voice_clone_status: string | null
          voice_id: string
          voice_name: string | null
          voice_provider: string
          voice_source: string
          voicemail_after_attempt: number
          voicemail_enabled: boolean
          voicemail_script: string | null
          warning_before_max_duration: boolean
        }
        Insert: {
          after_hours_behavior?: string
          after_hours_voicemail_message?: string | null
          agent_name: string
          agent_title?: string | null
          amd_action?: string
          amd_enabled?: boolean
          answer_after_rings?: number
          background_noise?: string
          backup_transfer_number?: string | null
          business_hours?: Json
          call_direction?: string
          call_objective?: string
          cloned_voice_id?: string | null
          closing_script?: string | null
          company_name_override?: string | null
          compiled_system_prompt?: string | null
          consent_script?: string | null
          conversation_stages?: Json
          cooloff_days_not_interested?: number
          created_at?: string
          delay_between_calls_seconds?: number
          description?: string | null
          disclosure_script?: string | null
          disclosure_timing?: string
          enthusiasm_level?: number
          fallback_cta?: string | null
          faq_pairs?: Json | null
          filler_words_enabled?: boolean
          greeting_script: string
          hours_between_retries?: number
          id?: string
          if_no_human?: string
          inbound_greeting?: string | null
          industry?: string | null
          interruption_handling?: string
          knowledge_base_text?: string | null
          knowledge_base_urls?: string[] | null
          language?: string
          max_attempts_per_contact?: number
          max_call_duration_minutes?: number
          max_calls_per_contact_per_day?: number
          max_concurrent_calls?: number
          objection_handling?: Json
          play_disclosure?: boolean
          post_call_email_body?: string | null
          post_call_email_enabled?: boolean
          post_call_email_subject?: string | null
          post_call_email_trigger?: string
          post_call_notification_email?: string | null
          post_call_notification_enabled?: boolean
          post_call_notification_includes?: Json
          post_call_notification_triggers?: Json
          post_call_sms_body?: string | null
          post_call_sms_enabled?: boolean
          post_call_task_enabled?: boolean
          primary_cta?: string
          record_calls?: boolean
          require_verbal_consent?: boolean
          respect_dnc?: boolean
          silence_timeout_seconds?: number
          speaking_speed?: number
          status?: string
          success_rate?: number | null
          tenant_id: string
          timezone?: string
          tone?: string
          total_calls?: number
          transfer_announcement?: string | null
          transfer_method?: string
          transfer_phone_number?: string | null
          transfer_timeout_seconds?: number
          transfer_triggers?: Json
          updated_at?: string
          vapi_assistant_id?: string | null
          vapi_last_synced_at?: string | null
          vapi_sync_error?: string | null
          vapi_sync_status?: string
          voice_clone_status?: string | null
          voice_id?: string
          voice_name?: string | null
          voice_provider?: string
          voice_source?: string
          voicemail_after_attempt?: number
          voicemail_enabled?: boolean
          voicemail_script?: string | null
          warning_before_max_duration?: boolean
        }
        Update: {
          after_hours_behavior?: string
          after_hours_voicemail_message?: string | null
          agent_name?: string
          agent_title?: string | null
          amd_action?: string
          amd_enabled?: boolean
          answer_after_rings?: number
          background_noise?: string
          backup_transfer_number?: string | null
          business_hours?: Json
          call_direction?: string
          call_objective?: string
          cloned_voice_id?: string | null
          closing_script?: string | null
          company_name_override?: string | null
          compiled_system_prompt?: string | null
          consent_script?: string | null
          conversation_stages?: Json
          cooloff_days_not_interested?: number
          created_at?: string
          delay_between_calls_seconds?: number
          description?: string | null
          disclosure_script?: string | null
          disclosure_timing?: string
          enthusiasm_level?: number
          fallback_cta?: string | null
          faq_pairs?: Json | null
          filler_words_enabled?: boolean
          greeting_script?: string
          hours_between_retries?: number
          id?: string
          if_no_human?: string
          inbound_greeting?: string | null
          industry?: string | null
          interruption_handling?: string
          knowledge_base_text?: string | null
          knowledge_base_urls?: string[] | null
          language?: string
          max_attempts_per_contact?: number
          max_call_duration_minutes?: number
          max_calls_per_contact_per_day?: number
          max_concurrent_calls?: number
          objection_handling?: Json
          play_disclosure?: boolean
          post_call_email_body?: string | null
          post_call_email_enabled?: boolean
          post_call_email_subject?: string | null
          post_call_email_trigger?: string
          post_call_notification_email?: string | null
          post_call_notification_enabled?: boolean
          post_call_notification_includes?: Json
          post_call_notification_triggers?: Json
          post_call_sms_body?: string | null
          post_call_sms_enabled?: boolean
          post_call_task_enabled?: boolean
          primary_cta?: string
          record_calls?: boolean
          require_verbal_consent?: boolean
          respect_dnc?: boolean
          silence_timeout_seconds?: number
          speaking_speed?: number
          status?: string
          success_rate?: number | null
          tenant_id?: string
          timezone?: string
          tone?: string
          total_calls?: number
          transfer_announcement?: string | null
          transfer_method?: string
          transfer_phone_number?: string | null
          transfer_timeout_seconds?: number
          transfer_triggers?: Json
          updated_at?: string
          vapi_assistant_id?: string | null
          vapi_last_synced_at?: string | null
          vapi_sync_error?: string | null
          vapi_sync_status?: string
          voice_clone_status?: string | null
          voice_id?: string
          voice_name?: string | null
          voice_provider?: string
          voice_source?: string
          voicemail_after_attempt?: number
          voicemail_enabled?: boolean
          voicemail_script?: string | null
          warning_before_max_duration?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_coaching_notes: {
        Row: {
          author_email: string
          author_user_id: string
          call_id: string
          created_at: string
          id: string
          note: string
          tenant_id: string
        }
        Insert: {
          author_email?: string
          author_user_id: string
          call_id: string
          created_at?: string
          id?: string
          note: string
          tenant_id: string
        }
        Update: {
          author_email?: string
          author_user_id?: string
          call_id?: string
          created_at?: string
          id?: string
          note?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_coaching_notes_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_coaching_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcript_comments: {
        Row: {
          author_email: string
          author_user_id: string
          call_id: string
          comment: string
          created_at: string
          id: string
          message_index: number
          tenant_id: string
        }
        Insert: {
          author_email?: string
          author_user_id: string
          call_id: string
          comment: string
          created_at?: string
          id?: string
          message_index: number
          tenant_id: string
        }
        Update: {
          author_email?: string
          author_user_id?: string
          call_id?: string
          comment?: string
          created_at?: string
          id?: string
          message_index?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcript_comments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcript_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          campaign_contact_id: string | null
          campaign_id: string | null
          contact_id: string | null
          contact_name: string | null
          cost_amount: number | null
          cost_breakdown: Json | null
          cost_llm: number | null
          cost_minutes: number | null
          cost_stt: number | null
          cost_total: number | null
          cost_transport: number | null
          cost_tts: number | null
          cost_vapi: number | null
          cost_with_margin: number | null
          created_at: string
          detected_intent: string | null
          direction: string
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          extracted_data: Json | null
          flag_reason: string | null
          from_number: string
          id: string
          internal_notes: string | null
          is_flagged: boolean
          outcome: string
          phone_number_id: string | null
          quality_score: number | null
          recording_duration_seconds: number | null
          recording_url: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          score_breakdown: Json | null
          score_feedback: Json | null
          sentiment: string | null
          sentiment_score: number | null
          sentiment_timeline: Json | null
          started_at: string
          summary: string | null
          tenant_id: string
          to_number: string
          transcript: Json | null
          transfer_reason: string | null
          transferred_to: string | null
          updated_at: string
          vapi_call_id: string
          was_transferred: boolean
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          campaign_contact_id?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          cost_amount?: number | null
          cost_breakdown?: Json | null
          cost_llm?: number | null
          cost_minutes?: number | null
          cost_stt?: number | null
          cost_total?: number | null
          cost_transport?: number | null
          cost_tts?: number | null
          cost_vapi?: number | null
          cost_with_margin?: number | null
          created_at?: string
          detected_intent?: string | null
          direction?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          extracted_data?: Json | null
          flag_reason?: string | null
          from_number: string
          id?: string
          internal_notes?: string | null
          is_flagged?: boolean
          outcome?: string
          phone_number_id?: string | null
          quality_score?: number | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          score_feedback?: Json | null
          sentiment?: string | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          started_at: string
          summary?: string | null
          tenant_id: string
          to_number: string
          transcript?: Json | null
          transfer_reason?: string | null
          transferred_to?: string | null
          updated_at?: string
          vapi_call_id: string
          was_transferred?: boolean
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          campaign_contact_id?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          cost_amount?: number | null
          cost_breakdown?: Json | null
          cost_llm?: number | null
          cost_minutes?: number | null
          cost_stt?: number | null
          cost_total?: number | null
          cost_transport?: number | null
          cost_tts?: number | null
          cost_vapi?: number | null
          cost_with_margin?: number | null
          created_at?: string
          detected_intent?: string | null
          direction?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          extracted_data?: Json | null
          flag_reason?: string | null
          from_number?: string
          id?: string
          internal_notes?: string | null
          is_flagged?: boolean
          outcome?: string
          phone_number_id?: string | null
          quality_score?: number | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          score_feedback?: Json | null
          sentiment?: string | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          started_at?: string
          summary?: string | null
          tenant_id?: string
          to_number?: string
          transcript?: Json | null
          transfer_reason?: string | null
          transferred_to?: string | null
          updated_at?: string
          vapi_call_id?: string
          was_transferred?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_campaign_contact_id_fkey"
            columns: ["campaign_contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          appointment_booked: boolean
          appointment_datetime: string | null
          callback_datetime: string | null
          callback_requested: boolean
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          last_attempt_at: string | null
          last_outcome: string | null
          next_attempt_at: string | null
          priority: number
          sentiment: string | null
          status: string
          tenant_id: string
          total_attempts: number
          updated_at: string
        }
        Insert: {
          appointment_booked?: boolean
          appointment_datetime?: string | null
          callback_datetime?: string | null
          callback_requested?: boolean
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_outcome?: string | null
          next_attempt_at?: string | null
          priority?: number
          sentiment?: string | null
          status?: string
          tenant_id: string
          total_attempts?: number
          updated_at?: string
        }
        Update: {
          appointment_booked?: boolean
          appointment_datetime?: string | null
          callback_datetime?: string | null
          callback_requested?: boolean
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_outcome?: string | null
          next_attempt_at?: string | null
          priority?: number
          sentiment?: string | null
          status?: string
          tenant_id?: string
          total_attempts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agent_id: string
          appointments_set: number
          avg_call_duration_seconds: number | null
          calling_days: Json | null
          calling_window_end: string
          calling_window_start: string
          contact_list_id: string | null
          contacts_callback: number
          contacts_called: number
          contacts_connected: number
          contacts_failed: number
          contacts_no_answer: number
          contacts_transferred: number
          contacts_voicemail: number
          conversion_rate: number | null
          created_at: string
          description: string | null
          estimated_days_to_complete: number | null
          estimated_minutes_usage: number | null
          id: string
          max_calls_per_day: number
          max_concurrent_calls: number
          name: string
          objective: string
          priority: string
          priority_hours: Json | null
          retry_busy: boolean
          retry_busy_after_minutes: number
          retry_busy_max: number
          retry_no_answer: boolean
          retry_no_answer_after_hours: number
          retry_no_answer_max: number
          retry_voicemail: boolean
          retry_voicemail_after_hours: number
          retry_voicemail_max: number
          scheduled_end: string | null
          scheduled_start: string | null
          smart_schedule_enabled: boolean
          status: string
          tenant_id: string
          timezone_strategy: string
          total_contacts: number
          total_minutes_used: number | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id: string
          appointments_set?: number
          avg_call_duration_seconds?: number | null
          calling_days?: Json | null
          calling_window_end?: string
          calling_window_start?: string
          contact_list_id?: string | null
          contacts_callback?: number
          contacts_called?: number
          contacts_connected?: number
          contacts_failed?: number
          contacts_no_answer?: number
          contacts_transferred?: number
          contacts_voicemail?: number
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          estimated_days_to_complete?: number | null
          estimated_minutes_usage?: number | null
          id?: string
          max_calls_per_day?: number
          max_concurrent_calls?: number
          name: string
          objective?: string
          priority?: string
          priority_hours?: Json | null
          retry_busy?: boolean
          retry_busy_after_minutes?: number
          retry_busy_max?: number
          retry_no_answer?: boolean
          retry_no_answer_after_hours?: number
          retry_no_answer_max?: number
          retry_voicemail?: boolean
          retry_voicemail_after_hours?: number
          retry_voicemail_max?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          smart_schedule_enabled?: boolean
          status?: string
          tenant_id: string
          timezone_strategy?: string
          total_contacts?: number
          total_minutes_used?: number | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id?: string
          appointments_set?: number
          avg_call_duration_seconds?: number | null
          calling_days?: Json | null
          calling_window_end?: string
          calling_window_start?: string
          contact_list_id?: string | null
          contacts_callback?: number
          contacts_called?: number
          contacts_connected?: number
          contacts_failed?: number
          contacts_no_answer?: number
          contacts_transferred?: number
          contacts_voicemail?: number
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          estimated_days_to_complete?: number | null
          estimated_minutes_usage?: number | null
          id?: string
          max_calls_per_day?: number
          max_concurrent_calls?: number
          name?: string
          objective?: string
          priority?: string
          priority_hours?: Json | null
          retry_busy?: boolean
          retry_busy_after_minutes?: number
          retry_busy_max?: number
          retry_no_answer?: boolean
          retry_no_answer_after_hours?: number
          retry_no_answer_max?: number
          retry_voicemail?: boolean
          retry_voicemail_after_hours?: number
          retry_voicemail_max?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          smart_schedule_enabled?: boolean
          status?: string
          tenant_id?: string
          timezone_strategy?: string
          total_contacts?: number
          total_minutes_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          description: string | null
          duplicate_contacts: number
          id: string
          invalid_contacts: number
          last_used_at: string | null
          last_used_campaign: string | null
          name: string
          source: string
          tenant_id: string
          total_contacts: number
          updated_at: string
          valid_contacts: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duplicate_contacts?: number
          id?: string
          invalid_contacts?: number
          last_used_at?: string | null
          last_used_campaign?: string | null
          name: string
          source?: string
          tenant_id: string
          total_contacts?: number
          updated_at?: string
          valid_contacts?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duplicate_contacts?: number
          id?: string
          invalid_contacts?: number
          last_used_at?: string | null
          last_used_campaign?: string | null
          name?: string
          source?: string
          tenant_id?: string
          total_contacts?: number
          updated_at?: string
          valid_contacts?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          contact_list_id: string | null
          created_at: string
          custom_fields: Json | null
          dnc_status: boolean
          email: string | null
          first_name: string
          id: string
          last_called_at: string | null
          last_name: string
          last_outcome: string | null
          phone: string
          tags: string[] | null
          tenant_id: string
          total_calls: number
          updated_at: string
        }
        Insert: {
          company?: string | null
          contact_list_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          dnc_status?: boolean
          email?: string | null
          first_name: string
          id?: string
          last_called_at?: string | null
          last_name: string
          last_outcome?: string | null
          phone: string
          tags?: string[] | null
          tenant_id: string
          total_calls?: number
          updated_at?: string
        }
        Update: {
          company?: string | null
          contact_list_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          dnc_status?: boolean
          email?: string | null
          first_name?: string
          id?: string
          last_called_at?: string | null
          last_name?: string
          last_outcome?: string | null
          phone?: string
          tags?: string[] | null
          tenant_id?: string
          total_calls?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_list: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          phone_number: string
          reason: string
          source: string | null
          tenant_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          phone_number: string
          reason?: string
          source?: string | null
          tenant_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          reason?: string
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dnc_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agent_id: string | null
          created_at: string
          extracted_text: string | null
          file_size_bytes: number
          file_type: string
          filename: string
          id: string
          processing_error: string | null
          processing_status: string
          storage_path: string
          tenant_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_size_bytes: number
          file_type: string
          filename: string
          id?: string
          processing_error?: string | null
          processing_status?: string
          storage_path: string
          tenant_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_size_bytes?: number
          file_type?: string
          filename?: string
          id?: string
          processing_error?: string | null
          processing_status?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          assigned_agent_ids: Json
          company_info: string | null
          created_at: string
          faq_pairs: Json
          id: string
          tenant_id: string
          updated_at: string
          website_content: string | null
          website_imported_at: string | null
          website_url: string | null
        }
        Insert: {
          assigned_agent_ids?: Json
          company_info?: string | null
          created_at?: string
          faq_pairs?: Json
          id?: string
          tenant_id: string
          updated_at?: string
          website_content?: string | null
          website_imported_at?: string | null
          website_url?: string | null
        }
        Update: {
          assigned_agent_ids?: Json
          company_info?: string | null
          created_at?: string
          faq_pairs?: Json
          id?: string
          tenant_id?: string
          updated_at?: string
          website_content?: string | null
          website_imported_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          icon: string | null
          id: string
          link: string | null
          read: boolean
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          tenant_id: string
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          area_code: string | null
          assigned_agent_id: string | null
          cnam_business_name: string | null
          cnam_registered: boolean
          created_at: string
          friendly_name: string | null
          id: string
          is_default: boolean
          monthly_cost: number
          number_type: string
          phone_number: string
          provider: string
          spam_score: string | null
          status: string
          stir_shaken_status: string | null
          tenant_id: string
          updated_at: string
          vapi_phone_id: string | null
        }
        Insert: {
          area_code?: string | null
          assigned_agent_id?: string | null
          cnam_business_name?: string | null
          cnam_registered?: boolean
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_default?: boolean
          monthly_cost?: number
          number_type?: string
          phone_number: string
          provider?: string
          spam_score?: string | null
          status?: string
          stir_shaken_status?: string | null
          tenant_id: string
          updated_at?: string
          vapi_phone_id?: string | null
        }
        Update: {
          area_code?: string | null
          assigned_agent_id?: string | null
          cnam_business_name?: string | null
          cnam_registered?: boolean
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_default?: boolean
          monthly_cost?: number
          number_type?: string
          phone_number?: string
          provider?: string
          spam_score?: string | null
          status?: string
          stir_shaken_status?: string | null
          tenant_id?: string
          updated_at?: string
          vapi_phone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_call_tasks: {
        Row: {
          agent_id: string | null
          call_date: string | null
          call_id: string | null
          completed_at: string | null
          completed_by: string | null
          contact_name: string | null
          created_at: string
          description: string
          generated_by: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          agent_id?: string | null
          call_date?: string | null
          call_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_name?: string | null
          created_at?: string
          description: string
          generated_by?: string
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          agent_id?: string | null
          call_date?: string | null
          call_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string
          generated_by?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_call_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_tasks_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_schedule: {
        Row: {
          connect_rate: number
          day_of_week: number
          hour_of_day: number
          id: string
          score: string
          tenant_id: string
          total_calls: number
          total_connected: number
          updated_at: string
        }
        Insert: {
          connect_rate?: number
          day_of_week: number
          hour_of_day: number
          id?: string
          score?: string
          tenant_id: string
          total_calls?: number
          total_connected?: number
          updated_at?: string
        }
        Update: {
          connect_rate?: number
          day_of_week?: number
          hour_of_day?: number
          id?: string
          score?: string
          tenant_id?: string
          total_calls?: number
          total_connected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenant_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing_cycle_end: string
          billing_cycle_start: string
          company_address: string | null
          company_name: string
          company_website: string | null
          consent_script: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          credit_balance: number
          crm_webhook_url: string | null
          default_calling_hours_end: string
          default_calling_hours_start: string
          default_timezone: string
          hard_stop_enabled: boolean
          id: string
          industry: string
          logo_url: string | null
          margin_percent: number
          minutes_used_this_cycle: number
          monthly_minute_limit: number
          onboarding_completed: boolean
          overage_rate_per_minute: number
          owner_user_id: string
          plan: string
          recording_disclosure_enabled: boolean
          recording_disclosure_text: string | null
          recording_enabled: boolean
          require_consent: boolean
          slack_webhook_url: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tcpa_compliance_mode: string
          total_cost_this_cycle: number
          trial_ends_at: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          updated_at: string
          usage_alert_sent: boolean
          usage_alert_threshold: number
          webhook_events: string[] | null
          webhook_url: string | null
        }
        Insert: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          company_address?: string | null
          company_name: string
          company_website?: string | null
          consent_script?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          credit_balance?: number
          crm_webhook_url?: string | null
          default_calling_hours_end?: string
          default_calling_hours_start?: string
          default_timezone?: string
          hard_stop_enabled?: boolean
          id?: string
          industry?: string
          logo_url?: string | null
          margin_percent?: number
          minutes_used_this_cycle?: number
          monthly_minute_limit?: number
          onboarding_completed?: boolean
          overage_rate_per_minute?: number
          owner_user_id: string
          plan?: string
          recording_disclosure_enabled?: boolean
          recording_disclosure_text?: string | null
          recording_enabled?: boolean
          require_consent?: boolean
          slack_webhook_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tcpa_compliance_mode?: string
          total_cost_this_cycle?: number
          trial_ends_at?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string
          usage_alert_sent?: boolean
          usage_alert_threshold?: number
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Update: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          company_address?: string | null
          company_name?: string
          company_website?: string | null
          consent_script?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          credit_balance?: number
          crm_webhook_url?: string | null
          default_calling_hours_end?: string
          default_calling_hours_start?: string
          default_timezone?: string
          hard_stop_enabled?: boolean
          id?: string
          industry?: string
          logo_url?: string | null
          margin_percent?: number
          minutes_used_this_cycle?: number
          monthly_minute_limit?: number
          onboarding_completed?: boolean
          overage_rate_per_minute?: number
          owner_user_id?: string
          plan?: string
          recording_disclosure_enabled?: boolean
          recording_disclosure_text?: string | null
          recording_enabled?: boolean
          require_consent?: boolean
          slack_webhook_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tcpa_compliance_mode?: string
          total_cost_this_cycle?: number
          trial_ends_at?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string
          usage_alert_sent?: boolean
          usage_alert_threshold?: number
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      tool_activity_log: {
        Row: {
          call_id: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          summary: string | null
          tenant_id: string
          tool_id: string
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          summary?: string | null
          tenant_id: string
          tool_id: string
        }
        Update: {
          call_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          summary?: string | null
          tenant_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_activity_log_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_activity_log_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_api_keys: {
        Row: {
          additional_config: Json
          api_key: string
          connected_at: string
          display_name: string | null
          id: string
          last_verified_at: string | null
          service: string
          status: string
          tenant_id: string
        }
        Insert: {
          additional_config?: Json
          api_key: string
          connected_at?: string
          display_name?: string | null
          id?: string
          last_verified_at?: string | null
          service: string
          status?: string
          tenant_id: string
        }
        Update: {
          additional_config?: Json
          api_key?: string
          connected_at?: string
          display_name?: string | null
          id?: string
          last_verified_at?: string | null
          service?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          assigned_agent_ids: Json
          created_at: string
          description: string
          id: string
          last_used_at: string | null
          message_complete: string | null
          message_failed: string | null
          message_start: string | null
          name: string
          parameters: Json
          service: string
          service_config: Json
          status: string
          template: string | null
          tenant_id: string
          total_uses: number
          updated_at: string
          vapi_tool_id: string | null
        }
        Insert: {
          assigned_agent_ids?: Json
          created_at?: string
          description: string
          id?: string
          last_used_at?: string | null
          message_complete?: string | null
          message_failed?: string | null
          message_start?: string | null
          name: string
          parameters?: Json
          service: string
          service_config?: Json
          status?: string
          template?: string | null
          tenant_id: string
          total_uses?: number
          updated_at?: string
          vapi_tool_id?: string | null
        }
        Update: {
          assigned_agent_ids?: Json
          created_at?: string
          description?: string
          id?: string
          last_used_at?: string | null
          message_complete?: string | null
          message_failed?: string | null
          message_start?: string | null
          name?: string
          parameters?: Json
          service?: string
          service_config?: Json
          status?: string
          template?: string | null
          tenant_id?: string
          total_uses?: number
          updated_at?: string
          vapi_tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          agent_id: string | null
          created_at: string
          difficulty: string
          duration_seconds: number | null
          feedback: Json | null
          id: string
          mode: string
          scenario: string
          score: number | null
          score_breakdown: Json | null
          status: string
          tenant_id: string
          transcript: Json | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          difficulty?: string
          duration_seconds?: number | null
          feedback?: Json | null
          id?: string
          mode?: string
          scenario: string
          score?: number | null
          score_breakdown?: Json | null
          status?: string
          tenant_id: string
          transcript?: Json | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          difficulty?: string
          duration_seconds?: number | null
          feedback?: Json | null
          id?: string
          mode?: string
          scenario?: string
          score?: number | null
          score_breakdown?: Json | null
          status?: string
          tenant_id?: string
          transcript?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          billing_cycle_end: string
          billing_cycle_start: string
          call_id: string | null
          created_at: string
          event_type: string
          id: string
          quantity: number
          tenant_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          billing_cycle_end: string
          billing_cycle_start: string
          call_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          quantity: number
          tenant_id: string
          total_cost: number
          unit_cost: number
        }
        Update: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          call_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          quantity?: number
          tenant_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_voice_collection: {
        Row: {
          added_at: string
          id: string
          tenant_id: string
          voice_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          tenant_id: string
          voice_id: string
        }
        Update: {
          added_at?: string
          id?: string
          tenant_id?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_voice_collection_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_voice_collection_voice_id_fkey"
            columns: ["voice_id"]
            isOneToOne: false
            referencedRelation: "voices"
            referencedColumns: ["id"]
          },
        ]
      }
      voices: {
        Row: {
          accent: string | null
          clone_status: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: string
          is_default: boolean
          is_global: boolean
          language: string | null
          name: string
          provider: string
          provider_voice_id: string
          recording_url: string | null
          style: string | null
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          accent?: string | null
          clone_status?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          language?: string | null
          name: string
          provider?: string
          provider_voice_id: string
          recording_url?: string | null
          style?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          accent?: string | null
          clone_status?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          language?: string | null
          name?: string
          provider?: string
          provider_voice_id?: string
          recording_url?: string | null
          style?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_tenant_credits: {
        Args: { p_amount: number; p_tenant_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_agent_performance: {
        Args: { date_from: string; date_to: string }
        Returns: {
          agent_id: string
          agent_name: string
          appointments: number
          avg_duration: number
          avg_score: number
          connect_rate: number
          positive_sentiment_pct: number
          total_calls: number
        }[]
      }
      get_analytics_summary: {
        Args: { date_from: string; date_to: string }
        Returns: {
          appointments_set: number
          avg_duration_seconds: number
          connect_rate: number
          conversion_rate: number
          minutes_used: number
          total_calls: number
        }[]
      }
      get_calling_heatmap: {
        Args: { date_from: string; date_to: string }
        Returns: {
          connect_rate: number
          day_of_week: number
          hour: number
          total_calls: number
        }[]
      }
      get_calls_per_day: {
        Args: { date_from: string; date_to: string }
        Returns: {
          connected: number
          day: string
          failed: number
          no_answer: number
          total_calls: number
          voicemail: number
        }[]
      }
      get_conversion_funnel: {
        Args: { date_from: string; date_to: string }
        Returns: {
          appointments: number
          connected: number
          engaged: number
          qualified: number
          total_calls: number
        }[]
      }
      get_smart_schedule: {
        Args: never
        Returns: {
          connect_rate: number
          day_of_week: number
          hour_of_day: number
          score: string
          total_calls: number
          total_connected: number
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_role: { Args: never; Returns: string }
      increment_campaign_contact_attempts: {
        Args: { cc_id: string }
        Returns: undefined
      }
      increment_tenant_minutes: {
        Args: { p_minutes: number; p_tenant_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_smart_schedule: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
