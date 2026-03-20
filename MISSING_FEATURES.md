# Missing Features & Components — BenefitPath Voice Hub

## Context

BenefitPath Voice Hub is an AI-powered outbound calling platform for insurance agents (Medicare/benefits). The codebase is mature with 31 pages, 37 edge functions, 32 database tables, and integrations with VAPI, Twilio, ElevenLabs, Stripe, and OpenAI. This analysis identifies gaps between what's built and what a production-ready platform needs.

---

## Critical Priority

### 1. Test Suite (Completely Absent)
- **What's missing**: Only 1 placeholder test (`src/test/example.test.ts` — `expect(true).toBe(true)`)
- **Why it matters**: No safety net for regressions. The VAPI webhook handler alone is ~967 lines of critical call-routing logic with zero tests.
- **What to build**:
  - Unit tests for all 26 React hooks (especially `use-billing`, `use-agents`, `use-campaigns`)
  - Edge function tests (especially `vapi-webhook`, `score-call`, `launch-call`, `tool-webhook-handler`)
  - Integration tests for auth flows, campaign launch, and billing
  - E2E tests with Playwright (configured but empty — `playwright-fixture.ts` exists but no scenarios)
- **Key files**: `src/test/example.test.ts`, `vitest.config.ts`, `playwright.config.ts`

### 2. TCPA/HIPAA Compliance Implementation
- **What's missing**: Platform claims TCPA compliance and HIPAA readiness but lacks:
  - Consent tracking/recording (no consent table or fields)
  - Calling hours enforcement (no timezone-aware calling window logic)
  - Prior Express Written Consent (PEWC) verification before calls
  - BAA workflow for HIPAA
  - Automated national DNC registry scrubbing (local DNC list exists but no registry integration)
- **Why it matters**: Legal liability — TCPA violations carry $500-$1,500 per call in penalties
- **What to build**: Consent management system, calling hours guard in `launch-call` and `campaign-scheduler`, DNC registry API integration

### 3. Error Handling & Resilience
- **What's missing**:
  - No retry logic for VAPI API calls
  - No timeout handling on external fetch calls (Twilio, ElevenLabs, VAPI, CRM APIs)
  - Webhook returns 200 even on internal errors (intentional for VAPI but masks issues)
  - No circuit breaker for third-party service failures
- **Why it matters**: Silent failures in call routing, billing, or CRM sync
- **What to build**: Retry wrapper for external API calls, request timeouts, structured error logging

---

## High Priority

### 4. Real-time Call Monitoring
- **What's missing**: No WebSocket/real-time connection for live call status
- **Why it matters**: Supervisors can't monitor active calls, intervene, or see live transcripts
- **What to build**: Supabase Realtime subscriptions on `calls` table for live status updates, live transcript streaming

### 5. Knowledge Base URL Ingestion
- **What's missing**: `knowledge_base_urls` field exists in agents schema but no scraping/ingestion pipeline
- **Why it matters**: Agents can only use manually-entered FAQs or uploaded documents — can't learn from websites
- **What to build**: URL scraper edge function, text extraction, chunking, and storage in knowledge base
- **Key files**: Agent schema in `src/integrations/supabase/types.ts`, `supabase/functions/upload-document/`

### 6. Smart Schedule Optimization
- **What's missing**: Heatmap data is calculated and displayed but not used for actual call timing
- **Why it matters**: Campaign scheduler launches at configured time regardless of optimal contact windows
- **What to build**: Integrate smart schedule data into `campaign-scheduler` to prioritize calls during high-answer-rate windows
- **Key files**: `src/hooks/use-smart-schedule.ts`, `supabase/functions/campaign-scheduler/`

### 7. Data Export & Reporting
- **What's missing**: No export functionality for calls, contacts, analytics, or campaign results
- **Why it matters**: Insurance agencies need exportable reports for compliance audits and management review
- **What to build**: CSV/PDF export for call logs, campaign reports, analytics dashboards, compliance reports

### 8. Rate Limiting
- **What's missing**: No rate limiting on edge functions or public API
- **Why it matters**: API abuse, cost overruns, and potential DDoS vulnerability
- **What to build**: Rate limiting middleware for public-facing endpoints, especially `public-api` and `launch-call`

---

## Medium Priority

### 9. Audit Logging
- **What's missing**: No centralized audit trail for admin actions (agent changes, campaign launches, team member changes, billing actions)
- **Why it matters**: Compliance audits and security incident investigation
- **What to build**: Audit log table and logging middleware for sensitive operations

### 10. CI/CD Pipeline
- **What's missing**: No GitHub Actions, deployment scripts, or CI configuration
- **Why it matters**: No automated testing, linting, or deployment safeguards
- **What to build**: GitHub Actions for lint, type-check, test, and deploy workflows

### 11. Production Console Logging Cleanup
- **What's missing**: Debug `console.log` statements in production code
- **Where**: `CloneVoiceTab`, `TtsTestBox`, `SoaComplianceReport`, `use-voice-management`, `use-subscription`, `use-tools`, `Forge`, `CampaignWizard`
- **What to build**: Remove debug logs or replace with structured logging service

### 12. Call Recording Playback
- **What's missing**: `recording_url` is stored in calls table but playback UI is unclear — need to verify if `AiCommentaryPlayer` component handles this fully
- **What to build**: Verify recording playback works end-to-end; add download capability

### 13. Mobile Responsiveness
- **What's missing**: No evidence of mobile-specific testing or optimization beyond Tailwind's responsive classes
- **What to build**: Mobile-optimized views for key workflows (call logs, campaign monitoring, agent dashboard)

---

## Low Priority

### 14. Index Page Placeholder
- **What's missing**: `src/pages/Index.tsx` has a placeholder comment ("Update this page") — not exposed in main routing but exists
- **What to build**: Remove or redirect to `/welcome`

### 15. Google Calendar OAuth Flow
- **What's missing**: Google Calendar handler in `tool-webhook-handler` uses a Bearer token but no OAuth refresh flow
- **Why it matters**: Tokens expire; no mechanism to refresh them automatically
- **What to build**: OAuth token refresh logic or document manual token management

### 16. Zapier/n8n Native Integration
- **What's missing**: Tool system supports custom webhooks but no native Zapier/n8n triggers
- **What to build**: Zapier trigger/action endpoints, Zapier app listing
