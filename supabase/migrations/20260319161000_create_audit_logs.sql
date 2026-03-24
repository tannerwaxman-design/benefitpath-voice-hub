-- Audit log table for tracking user-initiated mutations
-- (agent create/update/delete, campaign launch/pause/cancel,
--  billing settings changes, tool/API key connect/disconnect)

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null,      -- e.g. "agent.created", "campaign.launched"
  entity_type text not null,      -- "agent" | "campaign" | "billing" | "tool"
  entity_id   uuid,               -- id of the affected record
  entity_name text,               -- human-readable label for quick scanning
  metadata    jsonb,              -- additional context (changed fields, action, etc.)
  created_at  timestamptz not null default now()
);

create index audit_logs_tenant_idx    on public.audit_logs(tenant_id);
create index audit_logs_tenant_ts_idx on public.audit_logs(tenant_id, created_at desc);
create index audit_logs_event_idx     on public.audit_logs(tenant_id, event_type);

alter table public.audit_logs enable row level security;

-- Tenants can only read their own audit logs
create policy "audit_logs_tenant_select"
  on public.audit_logs for select
  using (
    tenant_id = (
      select tenant_id from public.tenant_users
      where user_id = auth.uid()
      limit 1
    )
  );

-- Authenticated users can insert audit log entries for their own tenant
create policy "audit_logs_tenant_insert"
  on public.audit_logs for insert
  with check (
    tenant_id = (
      select tenant_id from public.tenant_users
      where user_id = auth.uid()
      limit 1
    )
  );
