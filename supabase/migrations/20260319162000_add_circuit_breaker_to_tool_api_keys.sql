-- Circuit breaker state columns on tool_api_keys.
-- failure_count    – consecutive failures since last success; resets to 0 on any success.
-- last_failure_at  – timestamp of the most recent failure (for observability).
-- circuit_opened_at – non-null when the circuit is open; null when closed.
--   Open  (blocking) : circuit_opened_at IS NOT NULL AND age < 60 s
--   Half-open (probe): circuit_opened_at IS NOT NULL AND age >= 60 s  → allow one attempt
--   Closed (normal)  : circuit_opened_at IS NULL

alter table public.tool_api_keys
  add column if not exists failure_count     integer     not null default 0,
  add column if not exists last_failure_at   timestamptz,
  add column if not exists circuit_opened_at timestamptz;

comment on column public.tool_api_keys.failure_count
  is 'Consecutive failures since last success. Resets to 0 on any successful call.';
comment on column public.tool_api_keys.last_failure_at
  is 'Timestamp of the most recent failure for this integration.';
comment on column public.tool_api_keys.circuit_opened_at
  is 'Non-null when the circuit is open; null when closed. After 60 s the circuit enters half-open and one probe is allowed.';
