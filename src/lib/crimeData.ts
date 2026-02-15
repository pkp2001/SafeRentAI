import { chatCompletion, hasAnyAIKey } from "@/lib/aiProvider";

// ────────────────────────────────────────────────
// JSON helper
// ────────────────────────────────────────────────

/** Robustly parse JSON from AI — handles code fences, trailing commas, truncation. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJsonParse(raw: string): any {
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { /* try fix */ }
  s = s.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(s); } catch { /* give up */ }
  console.warn("⚠️ Could not parse AI JSON in crimeData, returning empty");
  return {};
}

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface CrimeStats {
  suburb: string;
  state: string;
  postcode: string;
  totalCrimes: number;
  crimeRate: number; // per 100,000 residents
  violentCrimeRate: number;
  propertyCrimeRate: number;
  safetyScore: number; // 0-100 (higher = safer)
  trend: "increasing" | "decreasing" | "stable";
  lastUpdated: string;
  dataSource: string;
  topOffences?: string[];
}

export interface SafetyLevel {
  level: "very-safe" | "safe" | "moderate" | "caution" | "high-risk";
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  label: string;
  range: string;
}

// ────────────────────────────────────────────────
// In-memory cache  (suburb → CrimeStats)
// ────────────────────────────────────────────────

const crimeCache = new Map<string, CrimeStats>();
const pendingFetches = new Map<string, Promise<CrimeStats | null>>();

// ────────────────────────────────────────────────
// Fetch live crime data via OpenAI
// ────────────────────────────────────────────────
//
// Uses GPT-4o-mini to provide suburb-level crime statistics
// based on publicly available BOCSAR / ABS data in its
// training set.  Results are cached per suburb so each
// suburb is only queried once per session.
// ────────────────────────────────────────────────

export async function fetchCrimeStats(
  suburb: string,
  state = "NSW"
): Promise<CrimeStats | null> {
  if (!suburb) return null;

  const cacheKey = `${suburb.toLowerCase()}-${state.toLowerCase()}`;

  // 1. Return from cache
  if (crimeCache.has(cacheKey)) {
    return crimeCache.get(cacheKey)!;
  }

  // 2. De-duplicate concurrent requests for same suburb
  if (pendingFetches.has(cacheKey)) {
    return pendingFetches.get(cacheKey)!;
  }

  const promise = _doFetch(suburb, state, cacheKey);
  pendingFetches.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    pendingFetches.delete(cacheKey);
  }
}

async function _doFetch(
  suburb: string,
  state: string,
  cacheKey: string
): Promise<CrimeStats | null> {
  if (!hasAnyAIKey()) {
    console.warn(
      "⚠️ No AI API key — returning estimated crime data for",
      suburb
    );
    return _estimateFallback(suburb, state);
  }

  try {
    const prompt = `Provide crime statistics for the suburb of "${suburb}" in ${state}, Australia.

Use your knowledge of published BOCSAR (NSW Bureau of Crime Statistics and Research) data, ABS crime statistics, and any other Australian government crime data sources.

Return ONLY valid JSON with this exact structure:
{
  "suburb": "${suburb}",
  "state": "${state}",
  "postcode": "<4-digit postcode>",
  "totalCrimes": <annual incident count for the suburb>,
  "crimeRate": <incidents per 100,000 residents per year>,
  "violentCrimeRate": <violent crimes per 100,000 residents per year>,
  "propertyCrimeRate": <property crimes per 100,000 residents per year>,
  "safetyScore": <0-100 where 100 is safest>,
  "trend": "<increasing|decreasing|stable>",
  "topOffences": ["offence1", "offence2", "offence3"]
}

Important:
- Use realistic numbers consistent with BOCSAR published data
- safetyScore should reflect the suburb's relative safety compared to the state average
- Suburbs with very low crime should score 80-95, average 50-65, high crime 20-45
- Be accurate about the postcode
- If you're unsure about exact numbers, provide your best estimate based on the suburb's known characteristics`;

    const { content: raw, provider } = await chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "You are an Australian crime statistics analyst with expertise in BOCSAR and ABS data. You provide accurate, realistic suburb-level crime statistics. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 400,
    });

    console.log(`✅ Crime data for ${suburb} via ${provider}`);
    const parsed = safeJsonParse(raw);

    const stats: CrimeStats = {
      suburb: parsed.suburb || suburb,
      state: parsed.state || state,
      postcode: parsed.postcode || "",
      totalCrimes: Number(parsed.totalCrimes) || 0,
      crimeRate: Number(parsed.crimeRate) || 0,
      violentCrimeRate: Number(parsed.violentCrimeRate) || 0,
      propertyCrimeRate: Number(parsed.propertyCrimeRate) || 0,
      safetyScore: Math.max(0, Math.min(100, Number(parsed.safetyScore) || 50)),
      trend: (["increasing", "decreasing", "stable"] as const).includes(
        parsed.trend
      )
        ? parsed.trend
        : "stable",
      lastUpdated: new Date().toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      }),
      dataSource: `AI analysis of BOCSAR/ABS data (${provider})`,
      topOffences: Array.isArray(parsed.topOffences)
        ? parsed.topOffences
        : undefined,
    };

    // Cache it
    crimeCache.set(cacheKey, stats);
    return stats;
  } catch (error) {
    console.error("Crime data fetch failed for", suburb, error);
    // Return estimate fallback
    return _estimateFallback(suburb, state);
  }
}

/**
 * Simple estimation fallback when OpenAI is unavailable.
 * Uses a hash of the suburb name to generate a consistent
 * but plausible safety score.
 */
function _estimateFallback(suburb: string, state: string): CrimeStats {
  // Simple hash → deterministic score per suburb name
  let hash = 0;
  for (let i = 0; i < suburb.length; i++) {
    hash = (hash << 5) - hash + suburb.charCodeAt(i);
    hash |= 0;
  }
  const normalised = Math.abs(hash % 100);
  const safetyScore = Math.max(25, Math.min(90, 40 + normalised * 0.5));

  const crimeRate = Math.round(2000 + (100 - safetyScore) * 150);
  const violentCrimeRate = Math.round(crimeRate * 0.12);
  const propertyCrimeRate = Math.round(crimeRate * 0.48);
  const totalCrimes = Math.round(crimeRate * 0.08); // rough per-suburb estimate

  const stats: CrimeStats = {
    suburb,
    state,
    postcode: "",
    totalCrimes,
    crimeRate,
    violentCrimeRate,
    propertyCrimeRate,
    safetyScore: Math.round(safetyScore),
    trend: "stable",
    lastUpdated: new Date().toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
    }),
    dataSource: "Estimated (no API key)",
  };

  const cacheKey = `${suburb.toLowerCase()}-${state.toLowerCase()}`;
  crimeCache.set(cacheKey, stats);
  return stats;
}

// ────────────────────────────────────────────────
// Synchronous cache reader  (backward compatibility)
// ────────────────────────────────────────────────
//
// Returns cached data immediately or null if not yet fetched.
// Components should prefer fetchCrimeStats() or the useCrimeData hook.

export const getCrimeStats = (suburbOrAddress: string): CrimeStats | null => {
  if (!suburbOrAddress) return null;

  // Normalise input
  const normalised = suburbOrAddress
    .replace(/,?\s*(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s*\d*/gi, "")
    .trim();

  // Try exact cache match
  for (const [key, val] of crimeCache) {
    if (key.startsWith(normalised.toLowerCase())) return val;
  }

  // Try partial match
  for (const [, val] of crimeCache) {
    if (
      suburbOrAddress.toLowerCase().includes(val.suburb.toLowerCase()) ||
      val.suburb.toLowerCase().includes(normalised.toLowerCase())
    ) {
      return val;
    }
  }

  return null;
};

/**
 * Pre-warm the cache for a batch of suburbs.
 * Useful when loading search results — fire off all crime
 * data requests in parallel without blocking listing display.
 */
export async function prefetchCrimeData(
  suburbs: Array<{ suburb: string; state?: string }>
): Promise<void> {
  const unique = new Map<string, string>();
  for (const s of suburbs) {
    if (s.suburb) {
      unique.set(s.suburb.toLowerCase(), s.state || "NSW");
    }
  }

  await Promise.allSettled(
    Array.from(unique.entries()).map(([suburb, state]) =>
      fetchCrimeStats(suburb, state)
    )
  );
}

// ────────────────────────────────────────────────
// Safety level helpers
// ────────────────────────────────────────────────

export const getSafetyLevel = (safetyScore: number): SafetyLevel => {
  if (safetyScore >= 80) {
    return {
      level: "very-safe",
      color: "#10B981",
      darkColor: "#3FB950",
      bgColor: "#ECFDF5",
      darkBgColor: "#064E3B",
      label: "Very Safe",
      range: "80-100",
    };
  }
  if (safetyScore >= 65) {
    return {
      level: "safe",
      color: "#22C55E",
      darkColor: "#4ADE80",
      bgColor: "#F0FDF4",
      darkBgColor: "#14532D",
      label: "Safe",
      range: "65-79",
    };
  }
  if (safetyScore >= 50) {
    return {
      level: "moderate",
      color: "#F59E0B",
      darkColor: "#FCD34D",
      bgColor: "#FFFBEB",
      darkBgColor: "#78350F",
      label: "Moderate",
      range: "50-64",
    };
  }
  if (safetyScore >= 35) {
    return {
      level: "caution",
      color: "#FB923C",
      darkColor: "#FDBA74",
      bgColor: "#FFF7ED",
      darkBgColor: "#7C2D12",
      label: "Use Caution",
      range: "35-49",
    };
  }
  return {
    level: "high-risk",
    color: "#EF4444",
    darkColor: "#F87171",
    bgColor: "#FEF2F2",
    darkBgColor: "#7F1D1D",
    label: "High Risk",
    range: "0-34",
  };
};

export const getTrendIcon = (
  trend: "increasing" | "decreasing" | "stable"
) => {
  switch (trend) {
    case "decreasing":
      return { icon: "↓", color: "#10B981", label: "Decreasing" };
    case "increasing":
      return { icon: "↑", color: "#EF4444", label: "Increasing" };
    case "stable":
      return { icon: "→", color: "#64748B", label: "Stable" };
  }
};

export const safetyLevels: SafetyLevel[] = [
  getSafetyLevel(90),
  getSafetyLevel(70),
  getSafetyLevel(55),
  getSafetyLevel(40),
  getSafetyLevel(20),
];
