// ============================================================
// SHARED VAPI API CLIENT
// Used by all edge functions to communicate with VAPI
// ============================================================

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = Deno.env.get("VAPI_BASE_URL") || "https://api.vapi.ai";

export interface VapiRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  body?: Record<string, unknown>;
}

export interface VapiResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function vapiRequest<T = Record<string, unknown>>(
  options: VapiRequestOptions
): Promise<VapiResponse<T>> {
  const { method, endpoint, body } = options;

  try {
    const response = await fetch(`${VAPI_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const responseText = await response.text();
    let data: T | null = null;

    try {
      data = JSON.parse(responseText) as T;
    } catch {
      // Response might not be JSON (e.g., 204 No Content)
    }

    if (!response.ok) {
      console.error(`VAPI API Error [${response.status}]:`, responseText);
      return {
        ok: false,
        status: response.status,
        data: null,
        error: responseText,
      };
    }

    return { ok: true, status: response.status, data, error: null };
  } catch (err) {
    console.error("VAPI API Network Error:", err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
