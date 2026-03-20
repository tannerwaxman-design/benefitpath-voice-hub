# Missing Features & Components — BenefitPath Voice Hub

## Context

BenefitPath Voice Hub is an AI-powered outbound calling platform for insurance agents (Medicare/benefits). The codebase is mature with 31 pages, 37 edge functions, 32 database tables, and integrations with VAPI, Twilio, ElevenLabs, Stripe, and OpenAI. This analysis identifies gaps between what's built and what a production-ready platform needs.

---

## Critical Priority

### 1. Edge Functions JWT Verification Disabled
- **What's missing**: 24 of 25 edge functions in `supabase/config.toml` have `verify_jwt = false`. Only `process-email-queue` has JWT verification enabled. Functions like `create-agent`, `delete-agent`, `launch-call`, `launch-campaign`, `buy-twilio-number`, and `manage-tool` are callable without any Supabase auth token.
- **Why it matters**: Any internet user who knows the Supabase project URL can invoke these functions — a direct path to unauthorized data access, call launching, agent deletion, and billing manipulation.
- **What to build**:
  - Enable `verify_jwt = true` for all user-facing functions
  - Keep `verify_jwt = false` only for genuinely public endpoints: `vapi-webhook`, `tool-webhook-handler`, `public-api`, `auth-email-hook`
  - For cron-triggered functions (`billing-cycle-reset`, `campaign-scheduler`), add a shared secret header check
  - Audit every function's internal auth check for consistency
- **Key file**: `supabase/config.toml`

### 2. VAPI Webhook Authentication Commented Out
- **What's missing**: In `supabase/functions/vapi-webhook/index.ts` (line 29), the rejection of mismatched webhook secrets is commented out: `// In production, uncomment: return new Response("Unauthorized", { status: 401 });`. The webhook logs a warning but processes the request anyway.
- **Why it matters**: Anyone can send forged webhook payloads to manipulate call records, trigger credit deductions, mark contacts as DNC, or corrupt campaign statistics. This is the most critical function in the system (~968 lines).
- **What to build**: Uncomment the 401 response; implement HMAC signature verification if VAPI supports it.
- **Key file**: `supabase/functions/vapi-webhook/index.ts` (line 29)

### 3. Twilio Credentials Stored as Plaintext
- **What's missing**: The `tenants` table stores `twilio_account_sid` and `twilio_auth_token` as plain string columns with no encryption at rest beyond Supabase database-level defaults.
- **Why it matters**: Any database breach, RLS bypass, or admin-level access leak exposes every tenant's Twilio credentials, granting full control over their Twilio account (make calls, read recordings, incur charges).
- **What to build**: Use Supabase Vault (pgsodium) to encrypt sensitive credentials at rest; update edge functions to decrypt only when needed.

### 4. TCPA Consent Tracking Not Implemented
- **What's missing**: Database schema contains `consent_script`, `require_verbal_consent`, and `tcpa_compliance_mode` columns, but no frontend component references these fields. No component renders, collects, or validates TCPA consent status. The campaign scheduler does not check whether prior express consent exists before dialing.
- **Why it matters**: TCPA violations carry $500-$1,500 per unsolicited call. For an outbound calling platform targeting Medicare beneficiaries, this is severe regulatory risk.
- **What to build**:
  - Consent status tracking per contact (`consent_given`, `consent_type`, `consent_date`, `consent_source`)
  - Consent verification step in campaign scheduler before launching calls
  - UI for managing consent records and opt-in/opt-out tracking
  - Configurable consent scripts in the agent builder
  - Audit logging for all consent events
- **Note**: Calling hours ARE enforced (`calling_window_start/end`, `calling_days` per campaign with tenant timezone) — this was initially flagged but is actually implemented in `campaign-scheduler`.

### 5. DNC List Has No National Registry Scrubbing
- **What's missing**: A `dnc_list` table exists and the webhook automatically adds contacts who request DNC removal. However, there is no integration with the FTC National Do Not Call Registry, no automated scrubbing of contact lists, and no pre-dial DNC check against external databases.
- **Why it matters**: Calling numbers on the National DNC Registry without an established business relationship is a federal violation.
- **What to build**: Integrate with a DNC registry API provider (e.g., DNC.com, Gryphon Networks); add automatic pre-dial DNC checks; support state-level DNC registries.

### 6. Test Suite (Completely Absent)
- **What's missing**: Only 1 placeholder test (`src/test/example.test.ts` — `expect(true).toBe(true)`). Vitest configured with jsdom, React Testing Library installed, Playwright configured — but none are used.
- **Why it matters**: No safety net for regressions. The VAPI webhook handler alone is ~968 lines of critical call-routing logic with zero tests.
- **What to build**:
  - Unit tests for all 26 React hooks (especially `use-billing`, `use-agents`, `use-campaigns`)
  - Edge function tests (especially `vapi-webhook`, `score-call`, `launch-call`, `tool-webhook-handler`)
  - Integration tests for auth flows, campaign launch, and billing
  - E2E tests with Playwright (configured but empty)
  - Minimum coverage threshold (suggest 60% initial target)
- **Key files**: `src/test/example.test.ts`, `vitest.config.ts`, `playwright.config.ts`

### 7. Error Handling & Resilience
- **What's missing**:
  - No retry logic for VAPI API calls
  - No timeout handling on external fetch calls (Twilio, ElevenLabs, VAPI, CRM APIs)
  - Webhook returns 200 even on internal errors (intentional for VAPI but masks issues)
  - No circuit breaker for third-party service failures
  - `fetchAndStoreCosts` in vapi-webhook uses a hard-coded 5-second `setTimeout` delay as a fragile timing workaround
- **Why it matters**: Silent failures in call routing, billing, or CRM sync
- **What to build**: Exponential backoff retry wrapper, `AbortController` timeouts, dead letter queue for failed operations

---

## High Priority

### 8. No CI/CD Pipeline
- **What's missing**: No `.github/workflows`, no `Dockerfile`, no CI configuration of any kind
- **Why it matters**: No automated build, test, lint, or deploy verification before production
- **What to build**: GitHub Actions for lint, type-check, unit tests, E2E tests, build verification, and automated Supabase migration deployment

### 9. Knowledge Base URL Ingestion
- **What's missing**: `knowledge_base` table has `website_url`, `website_content`, and `website_imported_at` fields. The hook can read/write these fields. But no backend function actually scrapes a URL or extracts content.
- **Why it matters**: Users expect to paste a URL and have the system ingest it — manual copy-paste is significant friction
- **What to build**: Edge function `scrape-url` for URL fetching, text extraction, and storage; sitemap parsing for multi-page crawling
- **Key files**: `src/hooks/use-knowledge-base.ts`, `supabase/functions/upload-document/`

### 10. PDF/DOCX Text Extraction Not Implemented
- **What's missing**: `upload-document` function accepts PDF, DOCX, TXT, and CSV uploads but only extracts text from TXT and CSV files (lines 91-101). PDF and DOCX files are uploaded and stored but remain in `processing_status: "pending"` forever.
- **Why it matters**: PDF and DOCX are the most common document formats users will upload for agent knowledge bases
- **What to build**: PDF text extraction (e.g., `pdf-parse`), DOCX extraction (e.g., `mammoth`), background processing pipeline, status update to "ready" after extraction
- **Key file**: `supabase/functions/upload-document/index.ts` (line 91)

### 11. Call Logs Export Button Non-Functional
- **What's missing**: `src/pages/CallLogs.tsx` (line 97) renders an "Export CSV" button with no `onClick` handler — purely decorative
- **Why it matters**: Data export is a basic requirement for insurance agencies sharing call records with compliance officers and regulators
- **What to build**: Implement CSV export with filters applied; add export to contacts, campaigns, and analytics views

### 12. Rate Limiting
- **What's missing**: No rate limiting on edge functions or the public API (`public-api` returns up to 200 records per request with no throttling)
- **Why it matters**: A compromised API key could trigger unlimited calls, exhaust credits, or hammer the database
- **What to build**: Rate limiting per API key (e.g., 100 req/min), call-specific throttling (e.g., 10 calls/min), rate limit headers

### 13. Real-time Call Monitoring
- **What's missing**: No live call status monitoring for supervisors (Supabase Realtime IS used for notifications but not for call status)
- **Why it matters**: Supervisors can't monitor active calls, intervene, or see live transcripts
- **What to build**: Supabase Realtime subscriptions on `calls` table for live status updates and transcript streaming

---

## Medium Priority

### 14. Audit Logging
- **What's missing**: No centralized audit trail for admin actions. Tool activity is logged (`tool_activity_log`), but no general-purpose audit for: user login, agent CRUD, campaign launch/pause, settings changes, team member management, billing actions.
- **Why it matters**: Insurance agencies operate in regulated environments; HIPAA readiness requires access logging
- **What to build**: `audit_log` table with `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `ip_address`, `timestamp`; viewer in Settings; 2-year retention policy

### 15. Production Console Logging Cleanup
- **What's missing**: 29+ `console.log/warn/error` statements across 9 frontend files — `CloneVoiceTab.tsx` (17 occurrences), `use-tools.ts` (4), `Forge.tsx` (2), and others
- **Why it matters**: Reveals internal state, API responses, and error details to anyone who opens browser DevTools
- **What to build**: Remove debug logs; implement structured logging utility with log levels; add ESLint `no-console` rule

### 16. Smart Schedule Proactive Optimization
- **What's missing**: Campaign scheduler defensively skips "avoid" slots (which IS implemented), but doesn't proactively reorder contact priority based on optimal calling times, suggest schedule changes, or optimize per-contact timezone
- **What to build**: Per-contact timezone detection, schedule suggestion engine, contact-level scheduling priority

### 17. Mobile Responsiveness
- **What's missing**: No mobile-specific testing; no Playwright viewport tests; layouts likely break on mobile despite Tailwind responsive utilities
- **What to build**: Audit all pages; add responsive breakpoints; add Playwright viewport tests for mobile (375px) and tablet (768px)

### 18. Call Recording Playback
- **What's missing**: `recording_url` is stored but playback UI needs verification; download capability unclear
- **What to build**: Verify end-to-end playback; add download button

---

## Low Priority

### 19. Index Page Placeholder
- **What's missing**: `src/pages/Index.tsx` displays "Welcome to Your Blank App" — the default Lovable template text. Separate `LandingPage.tsx` exists with proper content.
- **What to build**: Route index to LandingPage or redirect authenticated users to `/` (dashboard) and unauthenticated to `/welcome`

### 20. HIPAA Readiness Gaps
- **What's missing**: No BAA workflow, no data classification for PHI fields, no access logging for PHI records, no data retention/deletion policies, unclear recording storage access controls
- **What to build**: BAA template/signing workflow for enterprise tier; PHI field classification; access logging; retention policies with automated enforcement

### 21. Google Calendar OAuth Flow
- **What's missing**: Google Calendar handler uses Bearer token but no OAuth refresh flow — tokens expire with no refresh mechanism
- **What to build**: OAuth token refresh logic or documented manual token management

### 22. No Monitoring or Alerting
- **What's missing**: No Sentry, DataDog, or equivalent; no uptime monitoring; no alerting on error rates
- **What to build**: Error tracking service integration; uptime monitoring for webhooks; Slack/email alerting for error spikes

### 23. Zapier/n8n Native Integration
- **What's missing**: Tool system supports custom webhooks but no native Zapier/n8n triggers (can be served by existing webhook handler)
- **What to build**: Consider Google Sheets API handler for direct spreadsheet logging; clarify in UI which integrations are native vs webhook-based

---

## Summary Table

| # | Item | Priority | Risk Type | Effort |
|---|------|----------|-----------|--------|
| 1 | JWT disabled on all edge functions | Critical | Security | Low |
| 2 | VAPI webhook auth commented out | Critical | Security | Low |
| 3 | Twilio creds stored plaintext | Critical | Security | Medium |
| 4 | TCPA consent tracking not implemented | Critical | Legal | High |
| 5 | No national DNC registry scrubbing | Critical | Legal | Medium |
| 6 | Zero functional tests | Critical | Quality | High |
| 7 | No retry/timeout on API calls | Critical | Reliability | Medium |
| 8 | No CI/CD pipeline | High | Operations | Medium |
| 9 | Knowledge base URL scraping missing | High | Feature | Medium |
| 10 | PDF/DOCX text extraction missing | High | Feature | Medium |
| 11 | Call logs export non-functional | High | Feature | Low |
| 12 | Public API lacks rate limiting | High | Security | Medium |
| 13 | No live call monitoring | High | Feature | Medium |
| 14 | No audit logging system | Medium | Compliance | High |
| 15 | Debug console.log in production | Medium | Security | Low |
| 16 | Smart schedule proactive optimization | Medium | Feature | Medium |
| 17 | No mobile-responsive testing | Medium | UX | Medium |
| 18 | Call recording playback verification | Medium | Feature | Low |
| 19 | Index page is placeholder | Low | UX | Low |
| 20 | HIPAA readiness gaps | Low | Compliance | High |
| 21 | Google Calendar OAuth refresh | Low | Feature | Low |
| 22 | No monitoring/alerting | Low | Operations | Medium |
| 23 | Zapier/Sheets not first-class | Low | Feature | Low |
