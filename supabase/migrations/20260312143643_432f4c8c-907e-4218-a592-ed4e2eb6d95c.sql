
-- =============================================
-- BENEFITPATH MULTI-TENANT SCHEMA
-- =============================================

-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TABLE: tenants
-- =============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_address TEXT,
  industry TEXT NOT NULL DEFAULT 'insurance',
  logo_url TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  plan TEXT NOT NULL DEFAULT 'voice_ai_starter' CHECK (plan IN ('voice_ai_starter', 'voice_ai_pro', 'voice_ai_enterprise')),
  monthly_minute_limit INTEGER NOT NULL DEFAULT 5000,
  minutes_used_this_cycle INTEGER NOT NULL DEFAULT 0,
  overage_rate_per_minute DECIMAL(10,4) NOT NULL DEFAULT 0.05,
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_cycle_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  default_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  default_calling_hours_start TIME NOT NULL DEFAULT '09:00',
  default_calling_hours_end TIME NOT NULL DEFAULT '18:00',
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  recording_disclosure_enabled BOOLEAN NOT NULL DEFAULT true,
  recording_disclosure_text TEXT DEFAULT 'This call may be recorded for quality and training purposes.',
  tcpa_compliance_mode TEXT NOT NULL DEFAULT 'federal_and_state' CHECK (tcpa_compliance_mode IN ('federal_only', 'federal_and_state', 'custom')),
  require_consent BOOLEAN NOT NULL DEFAULT false,
  consent_script TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  trial_ends_at TIMESTAMPTZ,
  webhook_url TEXT,
  webhook_events TEXT[] DEFAULT '{}',
  crm_webhook_url TEXT,
  slack_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenants_status ON tenants(status);

-- =============================================
-- TABLE: tenant_users
-- =============================================
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);

-- =============================================
-- SECURITY DEFINER: get_user_tenant_id
-- Used in ALL RLS policies to avoid recursion
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1
$$;

-- =============================================
-- SECURITY DEFINER: get_user_tenant_role
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.tenant_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1
$$;

-- =============================================
-- TABLE: agents
-- =============================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vapi_assistant_id TEXT,
  vapi_sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (vapi_sync_status IN ('pending', 'synced', 'error', 'outdated')),
  vapi_last_synced_at TIMESTAMPTZ,
  vapi_sync_error TEXT,
  agent_name TEXT NOT NULL,
  agent_title TEXT,
  company_name_override TEXT,
  industry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'inactive', 'archived')),
  voice_provider TEXT NOT NULL DEFAULT 'eleven_labs',
  voice_id TEXT NOT NULL DEFAULT 'aria',
  voice_name TEXT,
  speaking_speed DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  tone TEXT NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'conversational', 'empathetic')),
  enthusiasm_level INTEGER NOT NULL DEFAULT 6 CHECK (enthusiasm_level BETWEEN 1 AND 10),
  filler_words_enabled BOOLEAN NOT NULL DEFAULT true,
  background_noise TEXT NOT NULL DEFAULT 'none' CHECK (background_noise IN ('none', 'office', 'call_center')),
  interruption_handling TEXT NOT NULL DEFAULT 'balanced' CHECK (interruption_handling IN ('patient', 'responsive', 'balanced')),
  language TEXT NOT NULL DEFAULT 'en-US',
  greeting_script TEXT NOT NULL,
  call_objective TEXT NOT NULL DEFAULT 'appointment_setting' CHECK (call_objective IN (
    'appointment_setting', 'lead_qualification', 'enrollment_followup',
    'policy_renewal', 'survey', 'payment_reminder', 'general_info', 'custom'
  )),
  conversation_stages JSONB NOT NULL DEFAULT '[]',
  objection_handling JSONB NOT NULL DEFAULT '[]',
  closing_script TEXT,
  voicemail_script TEXT,
  voicemail_enabled BOOLEAN NOT NULL DEFAULT true,
  voicemail_after_attempt INTEGER NOT NULL DEFAULT 2,
  primary_cta TEXT NOT NULL DEFAULT 'book_appointment' CHECK (primary_cta IN (
    'book_appointment', 'confirm_enrollment', 'collect_info', 'transfer', 'send_email', 'custom'
  )),
  fallback_cta TEXT DEFAULT 'send_email',
  knowledge_base_text TEXT,
  knowledge_base_urls TEXT[],
  faq_pairs JSONB DEFAULT '[]',
  max_concurrent_calls INTEGER NOT NULL DEFAULT 5,
  delay_between_calls_seconds INTEGER NOT NULL DEFAULT 3,
  max_calls_per_contact_per_day INTEGER NOT NULL DEFAULT 2,
  max_attempts_per_contact INTEGER NOT NULL DEFAULT 4,
  hours_between_retries INTEGER NOT NULL DEFAULT 24,
  cooloff_days_not_interested INTEGER NOT NULL DEFAULT 30,
  max_call_duration_minutes INTEGER NOT NULL DEFAULT 10,
  silence_timeout_seconds INTEGER NOT NULL DEFAULT 15,
  warning_before_max_duration BOOLEAN NOT NULL DEFAULT true,
  amd_enabled BOOLEAN NOT NULL DEFAULT true,
  amd_action TEXT NOT NULL DEFAULT 'leave_voicemail' CHECK (amd_action IN ('leave_voicemail', 'hangup_retry', 'mark_and_move_on')),
  business_hours JSONB NOT NULL DEFAULT '{"monday":{"enabled":true,"start":"09:00","end":"18:00"},"tuesday":{"enabled":true,"start":"09:00","end":"18:00"},"wednesday":{"enabled":true,"start":"09:00","end":"18:00"},"thursday":{"enabled":true,"start":"09:00","end":"18:00"},"friday":{"enabled":true,"start":"09:00","end":"18:00"},"saturday":{"enabled":false},"sunday":{"enabled":false}}',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  transfer_triggers JSONB NOT NULL DEFAULT '["human_requested","high_intent","frustrated"]',
  transfer_method TEXT NOT NULL DEFAULT 'warm' CHECK (transfer_method IN ('warm', 'cold', 'scheduled_callback')),
  transfer_phone_number TEXT,
  backup_transfer_number TEXT,
  transfer_announcement TEXT DEFAULT 'I''m going to connect you with one of our specialists who can help you further. Please hold for just a moment.',
  transfer_timeout_seconds INTEGER NOT NULL DEFAULT 30,
  if_no_human TEXT NOT NULL DEFAULT 'take_message' CHECK (if_no_human IN ('take_message', 'continue_ai', 'end_call')),
  record_calls BOOLEAN NOT NULL DEFAULT true,
  play_disclosure BOOLEAN NOT NULL DEFAULT true,
  disclosure_script TEXT DEFAULT 'This call may be recorded for quality and training purposes.',
  disclosure_timing TEXT NOT NULL DEFAULT 'before_greeting' CHECK (disclosure_timing IN ('before_greeting', 'after_greeting', 'after_identity')),
  require_verbal_consent BOOLEAN NOT NULL DEFAULT false,
  consent_script TEXT,
  respect_dnc BOOLEAN NOT NULL DEFAULT true,
  total_calls INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_status ON agents(tenant_id, status);
CREATE INDEX idx_agents_vapi ON agents(vapi_assistant_id);

-- =============================================
-- TABLE: contact_lists
-- =============================================
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'csv_upload' CHECK (source IN ('csv_upload', 'crm_sync', 'manual', 'api')),
  total_contacts INTEGER NOT NULL DEFAULT 0,
  valid_contacts INTEGER NOT NULL DEFAULT 0,
  invalid_contacts INTEGER NOT NULL DEFAULT 0,
  duplicate_contacts INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_used_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_lists_tenant ON contact_lists(tenant_id);

-- =============================================
-- TABLE: contacts
-- =============================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  dnc_status BOOLEAN NOT NULL DEFAULT false,
  last_called_at TIMESTAMPTZ,
  last_outcome TEXT,
  total_calls INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_list ON contacts(contact_list_id);
CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);
CREATE INDEX idx_contacts_dnc ON contacts(tenant_id, dnc_status);

-- =============================================
-- TABLE: phone_numbers
-- =============================================
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vapi_phone_id TEXT,
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  area_code TEXT,
  number_type TEXT NOT NULL DEFAULT 'local' CHECK (number_type IN ('local', 'toll_free')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'failed_verification', 'released')),
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 1.50,
  cnam_registered BOOLEAN NOT NULL DEFAULT false,
  cnam_business_name TEXT,
  stir_shaken_status TEXT DEFAULT 'not_registered' CHECK (stir_shaken_status IN ('full', 'partial', 'not_registered')),
  spam_score TEXT DEFAULT 'clean' CHECK (spam_score IN ('clean', 'some_flags', 'likely_flagged')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_agent ON phone_numbers(assigned_agent_id);

-- =============================================
-- TABLE: campaigns
-- =============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_id UUID NOT NULL REFERENCES agents(id),
  contact_list_id UUID REFERENCES contact_lists(id),
  objective TEXT NOT NULL DEFAULT 'appointment_setting' CHECK (objective IN (
    'appointment_setting', 'lead_qualification', 'information_delivery',
    'survey', 'payment_reminder', 'custom'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  max_calls_per_day INTEGER NOT NULL DEFAULT 200,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 5,
  calling_window_start TIME NOT NULL DEFAULT '09:00',
  calling_window_end TIME NOT NULL DEFAULT '18:00',
  calling_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
  timezone_strategy TEXT NOT NULL DEFAULT 'contact_local' CHECK (timezone_strategy IN ('contact_local', 'account_timezone')),
  priority_hours JSONB DEFAULT '[]',
  retry_no_answer BOOLEAN NOT NULL DEFAULT true,
  retry_no_answer_after_hours INTEGER NOT NULL DEFAULT 4,
  retry_no_answer_max INTEGER NOT NULL DEFAULT 3,
  retry_busy BOOLEAN NOT NULL DEFAULT true,
  retry_busy_after_minutes INTEGER NOT NULL DEFAULT 30,
  retry_busy_max INTEGER NOT NULL DEFAULT 2,
  retry_voicemail BOOLEAN NOT NULL DEFAULT true,
  retry_voicemail_after_hours INTEGER NOT NULL DEFAULT 24,
  retry_voicemail_max INTEGER NOT NULL DEFAULT 2,
  total_contacts INTEGER NOT NULL DEFAULT 0,
  contacts_called INTEGER NOT NULL DEFAULT 0,
  contacts_connected INTEGER NOT NULL DEFAULT 0,
  contacts_voicemail INTEGER NOT NULL DEFAULT 0,
  contacts_no_answer INTEGER NOT NULL DEFAULT 0,
  contacts_transferred INTEGER NOT NULL DEFAULT 0,
  contacts_callback INTEGER NOT NULL DEFAULT 0,
  contacts_failed INTEGER NOT NULL DEFAULT 0,
  appointments_set INTEGER NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_call_duration_seconds INTEGER DEFAULT 0,
  total_minutes_used DECIMAL(10,2) DEFAULT 0.00,
  estimated_days_to_complete INTEGER,
  estimated_minutes_usage DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_agent ON campaigns(agent_id);

-- =============================================
-- TABLE: campaign_contacts
-- =============================================
CREATE TABLE public.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'calling', 'connected', 'voicemail',
    'no_answer', 'busy', 'failed', 'completed', 'dnc',
    'callback_scheduled', 'skipped', 'max_attempts_reached'
  )),
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  last_outcome TEXT,
  appointment_booked BOOLEAN NOT NULL DEFAULT false,
  appointment_datetime TIMESTAMPTZ,
  callback_requested BOOLEAN NOT NULL DEFAULT false,
  callback_datetime TIMESTAMPTZ,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX idx_cc_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_cc_tenant ON campaign_contacts(tenant_id);
CREATE INDEX idx_cc_status ON campaign_contacts(campaign_id, status);
CREATE INDEX idx_cc_next_attempt ON campaign_contacts(campaign_id, status, next_attempt_at);

-- =============================================
-- TABLE: calls
-- =============================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vapi_call_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  campaign_id UUID REFERENCES campaigns(id),
  campaign_contact_id UUID REFERENCES campaign_contacts(id),
  contact_id UUID REFERENCES contacts(id),
  phone_number_id UUID REFERENCES phone_numbers(id),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  contact_name TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'in_progress' CHECK (outcome IN (
    'in_progress', 'connected', 'voicemail', 'no_answer', 'busy',
    'failed', 'transferred', 'callback_requested', 'dnc_requested',
    'wrong_number', 'completed'
  )),
  end_reason TEXT,
  transcript JSONB,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2),
  sentiment_timeline JSONB,
  detected_intent TEXT,
  extracted_data JSONB DEFAULT '{}',
  recording_url TEXT,
  recording_duration_seconds INTEGER,
  was_transferred BOOLEAN NOT NULL DEFAULT false,
  transferred_to TEXT,
  transfer_reason TEXT,
  cost_minutes DECIMAL(10,2) DEFAULT 0.00,
  cost_amount DECIMAL(10,4) DEFAULT 0.00,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_vapi ON calls(vapi_call_id);
CREATE INDEX idx_calls_campaign ON calls(campaign_id);
CREATE INDEX idx_calls_contact ON calls(contact_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_outcome ON calls(tenant_id, outcome);
CREATE INDEX idx_calls_date ON calls(tenant_id, started_at DESC);
CREATE INDEX idx_calls_sentiment ON calls(tenant_id, sentiment);

-- =============================================
-- TABLE: dnc_list
-- =============================================
CREATE TABLE public.dnc_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual' CHECK (reason IN ('manual', 'ai_detected', 'imported', 'contact_requested', 'regulatory')),
  source TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX idx_dnc_tenant ON dnc_list(tenant_id);
CREATE INDEX idx_dnc_phone ON dnc_list(tenant_id, phone_number);

-- =============================================
-- TABLE: documents
-- =============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  extracted_text TEXT,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_agent ON documents(agent_id);

-- =============================================
-- TABLE: usage_logs
-- =============================================
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('call_minutes', 'phone_number', 'sms', 'recording_storage')),
  quantity DECIMAL(10,4) NOT NULL,
  unit_cost DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(10,4) NOT NULL,
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_tenant ON usage_logs(tenant_id);
CREATE INDEX idx_usage_cycle ON usage_logs(tenant_id, billing_cycle_start, billing_cycle_end);

-- =============================================
-- UPDATED_AT TRIGGERS (all tables with updated_at)
-- =============================================
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_lists_updated_at BEFORE UPDATE ON contact_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_contacts_updated_at BEFORE UPDATE ON campaign_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- AUTO-CREATE TENANT + TENANT_USER ON SIGNUP
-- When a user signs up, create a tenant for them
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a tenant for the new user
  INSERT INTO public.tenants (owner_user_id, company_name, contact_email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'), NEW.email)
  RETURNING id INTO new_tenant_id;

  -- Add user as admin of their tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, status, accepted_at)
  VALUES (new_tenant_id, NEW.id, 'admin', 'active', NOW());

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- =============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: tenants
-- Users can only see their own tenant
-- =============================================
CREATE POLICY "Users can view their tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin')
  WITH CHECK (id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

-- =============================================
-- RLS POLICIES: tenant_users
-- =============================================
CREATE POLICY "Users can view their tenant members" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage tenant members" ON public.tenant_users
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

CREATE POLICY "Admins can update tenant members" ON public.tenant_users
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

CREATE POLICY "Admins can delete tenant members" ON public.tenant_users
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

-- =============================================
-- RLS POLICIES: All tenant-scoped tables
-- Pattern: tenant_id = get_user_tenant_id()
-- Admins + Managers can write, Viewers read-only
-- =============================================

-- AGENTS
CREATE POLICY "Tenant users can view agents" ON public.agents
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can create agents" ON public.agents
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update agents" ON public.agents
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins can delete agents" ON public.agents
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

-- CONTACT LISTS
CREATE POLICY "Tenant users can view contact lists" ON public.contact_lists
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can create contact lists" ON public.contact_lists
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update contact lists" ON public.contact_lists
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete contact lists" ON public.contact_lists
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- CONTACTS
CREATE POLICY "Tenant users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can create contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- PHONE NUMBERS
CREATE POLICY "Tenant users can view phone numbers" ON public.phone_numbers
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can create phone numbers" ON public.phone_numbers
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');
CREATE POLICY "Admins can update phone numbers" ON public.phone_numbers
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');
CREATE POLICY "Admins can delete phone numbers" ON public.phone_numbers
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

-- CAMPAIGNS
CREATE POLICY "Tenant users can view campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can create campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- CAMPAIGN CONTACTS
CREATE POLICY "Tenant users can view campaign contacts" ON public.campaign_contacts
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can create campaign contacts" ON public.campaign_contacts
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update campaign contacts" ON public.campaign_contacts
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete campaign contacts" ON public.campaign_contacts
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- CALLS
CREATE POLICY "Tenant users can view calls" ON public.calls
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "System can create calls" ON public.calls
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can update calls" ON public.calls
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- DNC LIST
CREATE POLICY "Tenant users can view DNC list" ON public.dnc_list
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can add to DNC" ON public.dnc_list
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins can remove from DNC" ON public.dnc_list
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() = 'admin');

-- DOCUMENTS
CREATE POLICY "Tenant users can view documents" ON public.documents
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins/managers can upload documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete documents" ON public.documents
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.get_user_tenant_role() IN ('admin', 'manager'));

-- USAGE LOGS (read-only for tenants, written by edge functions via service role)
CREATE POLICY "Tenant users can view usage logs" ON public.usage_logs
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
