-- Add unique constraint on calls.vapi_call_id to prevent duplicate call records
-- from VAPI webhook retries. A plain index already exists (idx_calls_vapi);
-- this replaces it with a unique index for database-level enforcement.
ALTER TABLE calls
  ADD CONSTRAINT calls_vapi_call_id_unique UNIQUE (vapi_call_id);
