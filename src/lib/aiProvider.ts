/**
 * Centralized AI provider — Google Gemini.
 *
 * Every AI feature in the app (scam scanning, chatbot, cover letters,
 * crime data) calls `chatCompletion()` so the underlying provider
 * can be swapped out in one place.
 *
 * Free tier: 15 RPM / 1M tokens/day on gemini-2.0-flash.
 * Get a key at https://aistudio.google.com/apikey
 */

import axios from "axios";

// ────────────────────────────────────────────────
// Environment / config
// ────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

export type ProviderName = "gemini";

// ────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  /** When true the model is asked to return valid JSON. */
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  provider: ProviderName;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

/** Check whether the Gemini API key is configured. */
export function hasAnyAIKey(): boolean {
  return !!GEMINI_API_KEY;
}

function getHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ────────────────────────────────────────────────
// Gemini adapter
// ────────────────────────────────────────────────

/**
 * Google Gemini REST API adapter.
 *
 * Translates OpenAI-style messages → Gemini format.
 * Tries multiple model versions for robustness.
 */
async function geminiCompletion(opts: CompletionOptions): Promise<string> {
  // Separate system messages from conversation
  const systemParts = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => ({ text: m.content }));

  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Gemini requires contents to start with a "user" turn.
  if (contents.length > 0 && contents[0].role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "." }] });
  }

  // Merge consecutive same-role turns (Gemini rejects them)
  const mergedContents: typeof contents = [];
  for (const c of contents) {
    const last = mergedContents[mergedContents.length - 1];
    if (last && last.role === c.role) {
      last.parts.push(...c.parts);
    } else {
      mergedContents.push({ ...c, parts: [...c.parts] });
    }
  }

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: opts.maxTokens ?? 1000,
  };
  if (opts.jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents: mergedContents,
    generationConfig,
  };
  if (systemParts.length > 0) {
    body.system_instruction = { parts: systemParts };
  }

  // Try multiple model versions for robustness (latest first)
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastErr: unknown;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      const candidate = res.data?.candidates?.[0];
      if (!candidate) throw new Error("Gemini returned no candidates");
      const text = candidate.content?.parts?.[0]?.text ?? "";
      if (!text) throw new Error("Gemini returned empty response");
      return text;
    } catch (err) {
      lastErr = err;
      const status = getHttpStatus(err);
      // 429 = rate limited → bubble up so caller can retry after delay
      if (status === 429) throw err;
      console.warn(`⚠️ Gemini model ${model} failed (${status}), trying next`);
    }
  }

  throw lastErr;
}

// ────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────

/**
 * Send a chat completion request via Gemini.
 *
 * Retries once on a 429 after a delay before giving up.
 */
export async function chatCompletion(
  opts: CompletionOptions
): Promise<CompletionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "No AI API key configured. Add VITE_GEMINI_API_KEY to your .env file. Get a free key at https://aistudio.google.com/apikey"
    );
  }

  let lastErr: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        const waitMs = 12_000;
        console.log(`⏳ Gemini rate-limited — retrying in ${waitMs / 1000}s`);
        await sleep(waitMs);
      }

      console.log(`🤖 AI request → gemini${attempt > 0 ? " (retry)" : ""}`);
      const content = await geminiCompletion(opts);
      return { content, provider: "gemini" };
    } catch (err: unknown) {
      lastErr = err;
      const status = getHttpStatus(err);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ Gemini failed (HTTP ${status ?? "?"}, attempt ${attempt + 1}):`,
        msg
      );

      // Retry once on 429; bubble up everything else immediately
      if (status === 429 && attempt === 0) continue;
      break;
    }
  }

  const status = getHttpStatus(lastErr);
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(
    `Gemini request failed (HTTP ${status ?? "?"}): ${msg}. Please wait a minute and try again, or check your API key.`
  );
}
