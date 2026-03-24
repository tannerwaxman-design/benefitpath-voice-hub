import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

// Extracts readable text from raw HTML
function extractText(html: string): string {
  // Remove script and style blocks entirely
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ");

  // Add newlines around block-level elements
  text = text
    .replace(/<\/?(h[1-6]|p|li|td|th|div|section|article|blockquote|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")   // strip remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");

  // Collapse whitespace but keep paragraph breaks
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    await getAuthContext(req);

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return errorResponse("url is required");
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return errorResponse("Invalid URL format");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return errorResponse("Only HTTP/HTTPS URLs are supported");
    }

    // Fetch the page
    const fetchResp = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "BenefitPath-KnowledgeBot/1.0 (content indexer)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!fetchResp.ok) {
      return errorResponse(`Failed to fetch page: HTTP ${fetchResp.status}`);
    }

    const contentType = fetchResp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return errorResponse("URL does not return HTML content");
    }

    const html = await fetchResp.text();
    const text = extractText(html);

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    // Limit to 50k characters
    const truncated = text.length > 50_000;
    const content = truncated ? text.slice(0, 50_000) + "\n\n[Content truncated — page was very long]" : text;

    return successResponse({ title, content, url: parsedUrl.toString(), truncated });
  } catch (err) {
    console.error("scrape-website error:", err);
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return errorResponse(err.message, 401);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Failed to scrape website",
      500
    );
  }
});
