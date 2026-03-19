/**
 * Circuit-breaker utilities for external service calls.
 *
 * State model (per tool_api_keys row):
 *   Closed    – circuit_opened_at IS NULL          → calls go through
 *   Open      – circuit_opened_at age < 60 s       → fast-fail immediately
 *   Half-open – circuit_opened_at age >= 60 s      → one probe allowed;
 *               success → Closed, failure → Open (re-arms timer)
 *
 * Failure threshold: 5 consecutive failures → Open.
 * All DB mutations are fire-and-forget; they never block the call result.
 */

// deno-lint-ignore-file no-explicit-any

const FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_MS   = 60_000;   // 60 seconds before half-open probe

/** Default per-request timeout for outbound HTTP calls. */
export const FETCH_TIMEOUT_MS = 8_000;

// ─────────────────────────────────────────────────────────────
// Timeout-aware fetch
// ─────────────────────────────────────────────────────────────

/**
 * Wraps fetch() with an AbortController timeout so hung external services
 * fail within `timeoutMs` instead of hanging indefinitely.
 */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// Circuit state helpers (pure — no I/O)
// ─────────────────────────────────────────────────────────────

/** Returns true when the circuit is in the Open window (should block calls). */
export function isCircuitBlocking(record: {
  circuit_opened_at: string | null;
}): boolean {
  if (!record.circuit_opened_at) return false;
  const ageMs = Date.now() - new Date(record.circuit_opened_at).getTime();
  return ageMs < CIRCUIT_OPEN_MS;
}

/** Returns a human-readable circuit state string (for logging). */
export function circuitState(record: {
  circuit_opened_at: string | null;
}): "closed" | "open" | "half_open" {
  if (!record.circuit_opened_at) return "closed";
  const ageMs = Date.now() - new Date(record.circuit_opened_at).getTime();
  return ageMs < CIRCUIT_OPEN_MS ? "open" : "half_open";
}

// ─────────────────────────────────────────────────────────────
// Circuit state mutations (fire-and-forget)
// ─────────────────────────────────────────────────────────────

/**
 * Call after a successful external service response.
 * Resets failure_count to 0 and clears circuit_opened_at (closes the circuit).
 */
export function recordCircuitSuccess(supabase: any, keyId: string): void {
  supabase
    .from("tool_api_keys")
    .update({ failure_count: 0, circuit_opened_at: null })
    .eq("id", keyId)
    .then(({ error }: { error: unknown }) => {
      if (error) console.warn("[circuit] recordCircuitSuccess failed:", error);
    });
}

/**
 * Call after a failed external service response (HTTP error, timeout, or exception).
 * Increments failure_count; opens the circuit once the threshold is crossed.
 */
export function recordCircuitFailure(
  supabase: any,
  keyId: string,
  currentFailureCount: number,
): void {
  const newCount = currentFailureCount + 1;
  const tripped   = newCount >= FAILURE_THRESHOLD;

  const update: Record<string, unknown> = {
    failure_count:   newCount,
    last_failure_at: new Date().toISOString(),
  };
  if (tripped) {
    update.circuit_opened_at = new Date().toISOString();
  }

  supabase
    .from("tool_api_keys")
    .update(update)
    .eq("id", keyId)
    .then(({ error }: { error: unknown }) => {
      if (error) console.warn("[circuit] recordCircuitFailure failed:", error);
      else if (tripped) {
        console.warn(`[circuit] Circuit OPENED for key ${keyId} after ${newCount} failures`);
      }
    });
}
