import { KeyManager } from "./keyManager.js";
import { ChatMessage, OpenRouterResponse, ToolDefinition } from "./types.js";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL = "https://openrouter.ai/api/v1/models";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class RotationExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RotationExhaustedError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toOpenRouterTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function stripInternalFields(m: ChatMessage) {
  const out: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
  if (m.name) out.name = m.name;
  if (m.tool_calls) out.tool_calls = m.tool_calls;
  return out;
}

/** Parse retry-after as seconds. Handles both integer seconds and HTTP-date strings. */
function parseRetryAfter(header: string | null): number {
  if (!header) return 30;
  const asNumber = Number(header);
  if (!isNaN(asNumber) && asNumber > 0) return Math.min(asNumber, 3600);
  const asDate = new Date(header).getTime();
  if (!isNaN(asDate)) return Math.max(1, Math.ceil((asDate - Date.now()) / 1000));
  return 30;
}

/** Wait for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core API call ────────────────────────────────────────────────────────────

/**
 * Sends a chat completion to OpenRouter with full key rotation.
 *
 * Rotation strategy (in order):
 *   1. Use current key.
 *   2. On 429 → parse retry-after, apply exponential backoff, rotate.
 *   3. On 402 → long cooldown (24h), rotate.
 *   4. On 401 → permanently disable key, rotate.
 *   5. On 5xx → short cooldown + short sleep, rotate.
 *   6. On network error → rotate (not the key's fault, but worth trying the next).
 *   7. On model-level error → pass to caller (not a key problem).
 *   8. After trying every key at least once → throw RotationExhaustedError.
 */
export async function chatCompletion(
  keyManager: KeyManager,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  siteUrl: string,
  appName: string
): Promise<OpenRouterResponse> {
  // Try every key at least once, plus one extra pass to handle keys coming off
  // cooldown mid-run (up to 2× the number of keys, max 20 total attempts).
  const maxAttempts = Math.min(keyManager.totalKeys * 2, 20);
  let lastError = "Unknown error";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = keyManager.current();
    let res: Response;

    // ── Network call ────────────────────────────────────────────────────────
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": siteUrl,
          "X-Title": appName,
        },
        body: JSON.stringify({
          model,
          messages: messages.map(stripInternalFields),
          tools: tools.length ? toOpenRouterTools(tools) : undefined,
        }),
      });
    } catch (networkErr) {
      // Pure network failure (no response) — not a key problem.
      lastError = `Network error: ${(networkErr as Error).message}`;
      // Brief pause before retry
      await sleep(500);
      continue;
    }

    // ── HTTP error handling ──────────────────────────────────────────────────

    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      keyManager.markLimited(key, retryAfter);
      lastError = `[429] Rate-limited. Key rotated. Retry-after: ${retryAfter}s.`;
      continue;
    }

    if (res.status === 402) {
      keyManager.markOutOfCredits(key);
      lastError = `[402] Out of credits on this key. Key rotated (24h cooldown).`;
      continue;
    }

    if (res.status === 401) {
      keyManager.markInvalid(key);
      lastError = `[401] Invalid API key. Key permanently disabled for this session.`;
      continue;
    }

    if (res.status >= 500) {
      keyManager.markServerError(key);
      lastError = `[${res.status}] OpenRouter server error. Key rotated.`;
      // Brief pause — server might need a moment
      await sleep(1000);
      continue;
    }

    if (!res.ok) {
      // 4xx that we don't specifically handle (403, 404, etc.)
      const text = await res.text().catch(() => "");
      lastError = `[${res.status}] OpenRouter error: ${text.slice(0, 300)}`;
      // Don't rotate key — this is likely a request problem not a key problem
      break;
    }

    // ── Parse response ───────────────────────────────────────────────────────

    let data: OpenRouterResponse;
    try {
      data = await res.json() as OpenRouterResponse;
    } catch {
      lastError = "Failed to parse JSON response from OpenRouter.";
      continue;
    }

    if (data.error) {
      const errMsg = data.error.message ?? String(data.error);
      // Some model-level errors (context length, etc.) are not key-related
      if (data.error.code === 429 || errMsg.toLowerCase().includes("rate limit")) {
        keyManager.markLimited(key, 30);
        lastError = `[model-429] ${errMsg}`;
        continue;
      }
      // Other model errors aren't key problems — surface to caller
      lastError = `OpenRouter model error: ${errMsg}`;
      break;
    }

    // ── Success ──────────────────────────────────────────────────────────────
    keyManager.markSuccess(key);
    return data;
  }

  throw new RotationExhaustedError(
    `All ${keyManager.totalKeys} key(s) exhausted after ${maxAttempts} attempts. Last error: ${lastError}`
  );
}

// ─── Model listing ────────────────────────────────────────────────────────────

export interface OpenRouterModelInfo {
  id: string;
  /** Human-readable name from OpenRouter, e.g. "Qwen: Qwen3-Coder" */
  name: string;
  /** Short description of the model from OpenRouter */
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

/** Returns true when a model is completely free (zero prompt cost or :free suffix). */
function isFreeModel(m: OpenRouterModelInfo): boolean {
  if (m.id.endsWith(":free")) return true;
  const promptCost = Number(m.pricing?.prompt ?? "1");
  const completionCost = Number(m.pricing?.completion ?? "1");
  return promptCost === 0 && completionCost === 0;
}

/** Truncates a description to the first sentence or ~120 chars max. */
export function shortDescription(desc: string | undefined): string {
  if (!desc) return "";
  // Strip markdown links [text](url) → text
  const clean = desc.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const firstSentence = clean.split(/\.\s/)[0].trim();
  if (firstSentence.length <= 120) return firstSentence + ".";
  return firstSentence.slice(0, 117) + "...";
}

/** Formats context length as human-readable string e.g. "128k" or "1M". */
export function formatContext(ctx: number | undefined): string {
  if (!ctx) return "";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(0)}M ctx`;
  return `${Math.round(ctx / 1000)}k ctx`;
}

/**
 * Fetches the live OpenRouter model catalog and returns ONLY free models
 * (zero prompt+completion cost OR id ending in :free).
 * Sorted alphabetically by id.
 */
export async function listFreeModels(): Promise<OpenRouterModelInfo[]> {
  const res = await fetch(MODELS_URL);
  if (!res.ok) throw new Error(`Could not fetch model list (${res.status})`);
  const data = (await res.json()) as { data: OpenRouterModelInfo[] };
  return (data.data || [])
    .filter(isFreeModel)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Fetches ALL models (free + paid) from OpenRouter. */
export async function listAllModels(): Promise<OpenRouterModelInfo[]> {
  const res = await fetch(MODELS_URL);
  if (!res.ok) throw new Error(`Could not fetch model list (${res.status})`);
  const data = (await res.json()) as { data: OpenRouterModelInfo[] };
  return data.data || [];
}
