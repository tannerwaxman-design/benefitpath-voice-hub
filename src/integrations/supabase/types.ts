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
          agent_name: string
          agent_title: string | null
          amd_action: string
          amd_enabled: boolean
          background_noise: string
          backup_transfer_number: string | null
          business_hours: Json
          call_objective: string
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
          voice_id: string
          voice_name: string | null
          voice_provider: string
          voicemail_after_attempt: number
          voicemail_enabled: boolean
          voicemail_script: string | null
          warning_before_max_duration: boolean
        }
        Insert: {
          agent_name: string
          agent_title?: string | null
          amd_action?: string
          amd_enabled?: boolean
          background_noise?: string
          backup_transfer_number?: string | null
          business_hours?: Json
          call_objective?: string
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
          voice_id?: string
          voice_name?: string | null
          voice_provider?: string
          voicemail_after_attempt?: number
          voicemail_enabled?: boolean
          voicemail_script?: string | null
          warning_before_max_duration?: boolean
        }
        Update: {
          agent_name?: string
          agent_title?: string | null
          amd_action?: string
          amd_enabled?: boolean
          background_noise?: string
          backup_transfer_number?: string | null
          business_hours?: Json
          call_objective?: string
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
          voice_id?: string
          voice_name?: string | null
          voice_provider?: string
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
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          campaign_contact_id: string | null
          campaign_id: string | null
          contact_id: string | null
          contact_name: string | null
          cost_amount: number | null
          cost_minutes: number | null
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
          recording_duration_seconds: number | null
          recording_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          cost_minutes?: number | null
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
          recording_duration_seconds?: number | null
          recording_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          cost_minutes?: number | null
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
          recording_duration_seconds?: number | null
          recording_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          crm_webhook_url: string | null
          default_calling_hours_end: string
          default_calling_hours_start: string
          default_timezone: string
          id: string
          industry: string
          logo_url: string | null
          minutes_used_this_cycle: number
          monthly_minute_limit: number
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
          trial_ends_at: string | null
          updated_at: string
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
          crm_webhook_url?: string | null
          default_calling_hours_end?: string
          default_calling_hours_start?: string
          default_timezone?: string
          id?: string
          industry?: string
          logo_url?: string | null
          minutes_used_this_cycle?: number
          monthly_minute_limit?: number
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
          trial_ends_at?: string | null
          updated_at?: string
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
          crm_webhook_url?: string | null
          default_calling_hours_end?: string
          default_calling_hours_start?: string
          default_timezone?: string
          id?: string
          industry?: string
          logo_url?: string | null
          minutes_used_this_cycle?: number
          monthly_minute_limit?: number
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
          trial_ends_at?: string | null
          updated_at?: string
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_performance: {
        Args: { date_from: string; date_to: string }
        Returns: {
          agent_id: string
          agent_name: string
          appointments: number
          avg_duration: number
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
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_role: { Args: never; Returns: string }
      increment_campaign_contact_attempts: {
        Args: { cc_id: string }
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
