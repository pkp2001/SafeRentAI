/**
 * Centralized AI provider with automatic fallback.
 *
 * Provider chain: Gemini → OpenRouter → OpenAI
 * (Gemini first because its free tier is the most generous: 15 RPM / 1M tokens/day)
 *
 * Every AI feature in the app (scam scanning, chatbot, cover letters,
 * crime data) calls `chatCompletion()` instead of hitting a specific
 * API directly.  If a provider fails for ANY reason (rate-limit,
 * network error, invalid model, etc.) the request is transparently
 * retried on the next provider in the chain.
 */

import axios from "axios";

// ────────────────────────────────────────────────
// Environment / config
// ────────────────────────────────────────────────

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as
  | string
  | undefined;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as
  | string
  | undefined;

export type ProviderName = "openai" | "gemini" | "openrouter";

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

/** Check whether *any* AI provider key is configured. */
export function hasAnyAIKey(): boolean {
  return !!(OPENAI_API_KEY || GEMINI_API_KEY || OPENROUTER_API_KEY);
}

/**
 * Return the ordered list of providers that have a key configured.
 * Gemini first (most generous free tier), then OpenRouter, then OpenAI.
 */
function availableProviders(): ProviderName[] {
  const list: ProviderName[] = [];
  if (GEMINI_API_KEY) list.push("gemini");
  if (OPENROUTER_API_KEY) list.push("openrouter");
  if (OPENAI_API_KEY) list.push("openai");
  return list;
}

function getHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ────────────────────────────────────────────────
// Provider adapters
// ────────────────────────────────────────────────

async function openaiCompletion(opts: CompletionOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1000,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    body,
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.choices[0].message.content ?? "";
}

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
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
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
      // 404 = model doesn't exist → try next model
      // 429 = rate limited → don't try another model, bubble up
      if (status === 429) throw err;
      console.warn(`⚠️ Gemini model ${model} failed (${status}), trying next`);
    }
  }

  throw lastErr;
}

/**
 * OpenRouter adapter.
 *
 * Tries multiple free models. Does NOT use response_format
 * because most free models don't support structured output —
 * instead we reinforce "respond with JSON only" in the messages.
 */
async function openrouterCompletion(opts: CompletionOptions): Promise<string> {
  // Models to try — confirmed working on OpenRouter free tier
  const models = [
    import.meta.env.VITE_OPENROUTER_MODEL, // User override (if set)
    "google/gemma-3-4b-it:free",           // Confirmed working
    "mistralai/mistral-small-3.1-24b-instruct:free", // Exists (may be rate limited)
  ].filter(Boolean) as string[];

  // Many free models on OpenRouter don't support the "system" role.
  // Merge system messages into the first user message to be safe.
  let messages: ChatMessage[] = [];
  const systemParts: string[] = [];

  for (const m of opts.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      messages.push(m);
    }
  }

  if (opts.jsonMode) {
    systemParts.push(
      "IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, no code fences — pure JSON only."
    );
  }

  // Prepend system context to first user message
  if (systemParts.length > 0 && messages.length > 0) {
    const firstUserIdx = messages.findIndex((m) => m.role === "user");
    if (firstUserIdx >= 0) {
      messages = messages.map((m, i) =>
        i === firstUserIdx
          ? {
              ...m,
              content:
                "[Instructions]\n" +
                systemParts.join("\n") +
                "\n[/Instructions]\n\n" +
                m.content,
            }
          : m
      );
    } else {
      // No user message yet — prepend one with system context
      messages.unshift({
        role: "user",
        content: systemParts.join("\n"),
      });
    }
  }

  let lastErr: unknown;

  for (const model of models) {
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1000,
      };

      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        body,
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              typeof window !== "undefined"
                ? window.location.origin
                : "https://saferentai.app",
            "X-Title": "SafeRent AI",
          },
        }
      );

      const content = res.data?.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("OpenRouter returned empty response");

      // Strip markdown code fences if model wrapped JSON in them
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      return cleaned;
    } catch (err) {
      lastErr = err;
      const status = getHttpStatus(err);
      if (status === 429) throw err; // Rate limit → bubble up
      console.warn(
        `⚠️ OpenRouter model ${model} failed (${status}), trying next`
      );
    }
  }

  throw lastErr;
}

// ────────────────────────────────────────────────
// Dispatch map
// ────────────────────────────────────────────────

const providerFn: Record<
  ProviderName,
  (opts: CompletionOptions) => Promise<string>
> = {
  openai: openaiCompletion,
  gemini: geminiCompletion,
  openrouter: openrouterCompletion,
};

// ────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────

/**
 * Send a chat completion request.
 *
 * Tries each configured provider in order (Gemini → OpenRouter → OpenAI).
 * Within each provider, retries once on a 429 after a delay before
 * falling back to the next provider. ALL other errors fall through
 * immediately to the next provider.
 */
export async function chatCompletion(
  opts: CompletionOptions
): Promise<CompletionResult> {
  const providers = availableProviders();
  if (providers.length === 0) {
    throw new Error(
      "No AI API keys configured. Add at least one of VITE_GEMINI_API_KEY, VITE_OPENROUTER_API_KEY, or VITE_OPENAI_API_KEY to your .env file."
    );
  }

  const errors: Array<{ provider: ProviderName; error: string }> = [];

  for (const provider of providers) {
    const fn = providerFn[provider];

    // Up to 2 attempts per provider (initial + one retry on 429)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          // Gemini says "retry in ~9s", OpenAI free tier needs longer
          const waitMs =
            provider === "openai" ? 15_000 : provider === "gemini" ? 12_000 : 6_000;
          console.log(
            `⏳ ${provider} rate-limited — retrying in ${waitMs / 1000}s`
          );
          await sleep(waitMs);
        }

        console.log(
          `🤖 AI request → ${provider}${attempt > 0 ? " (retry)" : ""}`
        );
        const content = await fn(opts);
        return { content, provider };
      } catch (err: unknown) {
        const status = getHttpStatus(err);
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `⚠️ ${provider} failed (HTTP ${status ?? "?"}, attempt ${attempt + 1}):`,
          msg
        );

        errors.push({ provider, error: `${status ?? "?"}: ${msg}` });

        if (status === 429 && attempt === 0) {
          // Will retry once on this provider
          continue;
        }
        // ANY other error (or second 429) → move to next provider
        break;
      }
    }
  }

  // All providers exhausted — build a useful error message
  const summary = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join(" | ");
  throw new Error(
    `All AI providers failed. ${summary}. Please wait a minute and try again, or check your API keys.`
  );
}
