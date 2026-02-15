import {
  searchProperties,
  type PropertyListing,
  type SearchParams,
} from "@/lib/realtyApi";
import { geocodeAddress, reverseGeocode } from "@/lib/geocoding";
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
  console.warn("⚠️ Could not parse AI JSON in chatbot, returning empty");
  return {};
}

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  properties?: PropertyListing[];
  searchParams?: SearchCriteria;
  followUpSuggestions?: string[];
}

export interface SearchCriteria {
  location?: string | null;
  suburb?: string | null;
  state?: string | null;
  minBedrooms?: number | null;
  maxBedrooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  propertyType?: string[] | null;
  proximityTo?: {
    landmark: string;
    maxDistance: number;
  } | null;
  features?: string[] | null;
}

// ────────────────────────────────────────────────
// Conversation-aware intent parsing
// ────────────────────────────────────────────────

/**
 * Build the intent-extraction system prompt.
 * If there is an active search context, we inject it so GPT carries
 * criteria forward and only overrides what the user explicitly changes.
 */
function buildIntentPrompt(activeCriteria: SearchCriteria | null): string {
  const base = `You are an Australian real estate search assistant. Your ONLY job is to produce a JSON object with the user's search criteria.

RULES:
1. Respond with ONLY valid JSON — no markdown, no explanation.
2. Use this exact schema (every field is optional — use null for unspecified):
{
  "location": "suburb, state" or null,
  "suburb": "suburb name" or null,
  "state": "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT" or null,
  "minBedrooms": number or null,
  "maxBedrooms": number or null,
  "minPrice": number (weekly) or null,
  "maxPrice": number (weekly) or null,
  "propertyType": ["house","apartment","townhouse","unit"] or null,
  "proximityTo": {"landmark":"full landmark name","maxDistance":number_km} or null,
  "features": ["pet-friendly","parking","furnished","pool"] or null
}
3. If the message is pure chat ("hello", "thanks", "ok") with zero search intent, return: {}
4. Weekly rent is the Australian norm. "$500" alone means $500/week.
5. "under $500" / "below $500" / "max $500" / "less than $500" → maxPrice = 500
6. "over $400" / "above $400" / "min $400" / "at least $400" → minPrice = 400
7. Default state to "NSW" for Sydney-metro suburbs.
8. "unit" = "apartment".
9. "Near X station" → proximityTo maxDistance 2 km.  "Walking distance to X" → 1 km.

CRITICAL — ALWAYS SET suburb AND state:
10. You MUST ALWAYS set "suburb" and "state" when the user has any search intent — even if they only mention a landmark, university, or station.
11. Map landmarks to their nearest suburb:
    - UTS / University of Technology Sydney → suburb "Ultimo", state "NSW"
    - UNSW / University of New South Wales → suburb "Kensington", state "NSW"
    - USyd / University of Sydney → suburb "Camperdown", state "NSW"
    - Macquarie University → suburb "Macquarie Park", state "NSW"
    - Western Sydney University Parramatta → suburb "Parramatta", state "NSW"
    - USYD → suburb "Camperdown", state "NSW"
    - Monash University → suburb "Clayton", state "VIC"
    - University of Melbourne → suburb "Parkville", state "VIC"
    - UQ / University of Queensland → suburb "St Lucia", state "QLD"
    - If the user mentions any station, school, hospital, or landmark, infer the closest suburb and ALWAYS populate "suburb" and "state".
12. If the user just says a city name (e.g. "Sydney", "Melbourne"), set suburb to the city name.
13. NEVER return a non-empty JSON without "suburb" or "state" — there must always be a search location.`;

  if (activeCriteria && hasAnyCriteria(activeCriteria)) {
    return `${base}

IMPORTANT — CONTEXT CARRY-FORWARD:
The user already has an active search with these criteria:
${JSON.stringify(stripNulls(activeCriteria), null, 2)}

When the user sends a follow-up message:
- KEEP all existing criteria that the user does NOT explicitly change.
- OVERRIDE only the criteria the user explicitly mentions.
- For example, if active search is suburb="Parramatta" and user says "make it 3 bedrooms", keep suburb="Parramatta" and set minBedrooms=3, maxBedrooms=3.
- If the user says "search Melbourne instead", change suburb to "Melbourne" and state to "VIC" but keep the rest.
- Always output the FULL merged criteria, not just the changes.`;
  }

  return base;
}

// ────────────────────────────────────────────────
// Parse intent
// ────────────────────────────────────────────────

export async function parseUserIntent(
  userMessage: string,
  conversationHistory: ChatMessage[],
  activeCriteria: SearchCriteria | null
): Promise<SearchCriteria> {
  if (!hasAnyAIKey()) {
    const fresh = extractKeywordsFallback(userMessage);
    return mergeCriteria(activeCriteria, fresh);
  }

  try {
    const history = conversationHistory.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const systemPrompt = buildIntentPrompt(activeCriteria);

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 500,
    });

    const parsed: SearchCriteria = safeJsonParse(content || "{}");
    console.log("🤖 Parsed search criteria:", parsed);

    // Safety-net merge: if GPT forgot to carry forward, we merge ourselves
    return mergeCriteria(activeCriteria, parsed);
  } catch (err) {
    console.warn("Intent parsing failed, using keyword fallback:", err);
    const fresh = extractKeywordsFallback(userMessage);
    return mergeCriteria(activeCriteria, fresh);
  }
}

// ────────────────────────────────────────────────
// Merge helper — carry forward active criteria,
// overriding only what the new parse provides.
// ────────────────────────────────────────────────

function mergeCriteria(
  active: SearchCriteria | null,
  incoming: SearchCriteria
): SearchCriteria {
  if (!active || !hasAnyCriteria(active)) return incoming;
  if (!hasAnyCriteria(incoming)) return active; // pure chat, keep old

  // Start from active, override with non-null incoming values
  const merged: SearchCriteria = { ...active };
  for (const key of Object.keys(incoming) as (keyof SearchCriteria)[]) {
    const val = incoming[key];
    if (val !== null && val !== undefined) {
      (merged as any)[key] = val;
    }
  }
  return merged;
}

function hasAnyCriteria(c: SearchCriteria): boolean {
  return Object.values(c).some(
    (v) => v !== null && v !== undefined && v !== ""
  );
}

function stripNulls(obj: SearchCriteria): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

// ────────────────────────────────────────────────
// Keyword fallback (no API key)
// ────────────────────────────────────────────────

// Well-known landmarks → nearest suburb for search
const LANDMARK_TO_SUBURB: Record<string, { suburb: string; state: string; fullName: string }> = {
  uts: { suburb: "Ultimo", state: "NSW", fullName: "University of Technology Sydney" },
  "university of technology sydney": { suburb: "Ultimo", state: "NSW", fullName: "University of Technology Sydney" },
  unsw: { suburb: "Kensington", state: "NSW", fullName: "University of New South Wales" },
  "university of new south wales": { suburb: "Kensington", state: "NSW", fullName: "University of New South Wales" },
  usyd: { suburb: "Camperdown", state: "NSW", fullName: "University of Sydney" },
  "university of sydney": { suburb: "Camperdown", state: "NSW", fullName: "University of Sydney" },
  "sydney university": { suburb: "Camperdown", state: "NSW", fullName: "University of Sydney" },
  "macquarie university": { suburb: "Macquarie Park", state: "NSW", fullName: "Macquarie University" },
  "macquarie uni": { suburb: "Macquarie Park", state: "NSW", fullName: "Macquarie University" },
  "western sydney university": { suburb: "Parramatta", state: "NSW", fullName: "Western Sydney University" },
  "wsu": { suburb: "Parramatta", state: "NSW", fullName: "Western Sydney University" },
  "uts broadway": { suburb: "Ultimo", state: "NSW", fullName: "UTS Broadway Campus" },
  "monash university": { suburb: "Clayton", state: "VIC", fullName: "Monash University" },
  "monash uni": { suburb: "Clayton", state: "VIC", fullName: "Monash University" },
  "university of melbourne": { suburb: "Parkville", state: "VIC", fullName: "University of Melbourne" },
  "melbourne uni": { suburb: "Parkville", state: "VIC", fullName: "University of Melbourne" },
  uq: { suburb: "St Lucia", state: "QLD", fullName: "University of Queensland" },
  "university of queensland": { suburb: "St Lucia", state: "QLD", fullName: "University of Queensland" },
  "sydney cbd": { suburb: "Sydney", state: "NSW", fullName: "Sydney CBD" },
  "melbourne cbd": { suburb: "Melbourne", state: "VIC", fullName: "Melbourne CBD" },
  "brisbane cbd": { suburb: "Brisbane", state: "QLD", fullName: "Brisbane CBD" },
  "circular quay": { suburb: "Sydney", state: "NSW", fullName: "Circular Quay" },
  "opera house": { suburb: "Sydney", state: "NSW", fullName: "Sydney Opera House" },
  "olympic park": { suburb: "Homebush", state: "NSW", fullName: "Sydney Olympic Park" },
  "westmead hospital": { suburb: "Westmead", state: "NSW", fullName: "Westmead Hospital" },
  "royal prince alfred hospital": { suburb: "Camperdown", state: "NSW", fullName: "Royal Prince Alfred Hospital" },
  rpa: { suburb: "Camperdown", state: "NSW", fullName: "Royal Prince Alfred Hospital" },
};

function extractKeywordsFallback(message: string): SearchCriteria {
  const c: SearchCriteria = {};
  const lower = message.toLowerCase();

  // ── Landmarks / universities / known places ──
  for (const [keyword, info] of Object.entries(LANDMARK_TO_SUBURB)) {
    if (lower.includes(keyword)) {
      c.suburb = info.suburb;
      c.state = info.state;
      c.proximityTo = {
        landmark: info.fullName,
        maxDistance: lower.includes("walking") ? 1 : 3,
      };
      break;
    }
  }

  // ── Suburbs ──
  if (!c.suburb) {
    const knownSuburbs: Record<string, string> = {
      parramatta: "NSW",
      "bella vista": "NSW",
      sydney: "NSW",
      bondi: "NSW",
      manly: "NSW",
      "castle hill": "NSW",
      penrith: "NSW",
      blacktown: "NSW",
      chatswood: "NSW",
      "surry hills": "NSW",
      newtown: "NSW",
      strathfield: "NSW",
      homebush: "NSW",
      ultimo: "NSW",
      broadway: "NSW",
      kensington: "NSW",
      camperdown: "NSW",
      redfern: "NSW",
      glebe: "NSW",
      chippendale: "NSW",
      pyrmont: "NSW",
      darlinghurst: "NSW",
      randwick: "NSW",
      coogee: "NSW",
      marrickville: "NSW",
      burwood: "NSW",
      epping: "NSW",
      ryde: "NSW",
      hurstville: "NSW",
      bankstown: "NSW",
      liverpool: "NSW",
      campbelltown: "NSW",
      melbourne: "VIC",
      richmond: "VIC",
      brisbane: "QLD",
      adelaide: "SA",
      perth: "WA",
    };

    for (const [sub, st] of Object.entries(knownSuburbs)) {
      if (lower.includes(sub)) {
        c.suburb = sub
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        c.state = st;
        break;
      }
    }
  }

  // ── Bedrooms ──
  const bedMatch = lower.match(/(\d+)\s*(?:bed|bedroom|br)/);
  if (bedMatch) {
    const n = parseInt(bedMatch[1], 10);
    c.minBedrooms = n;
    c.maxBedrooms = n;
  }

  // ── Price ──
  const priceMatch = lower.match(/\$\s*(\d[\d,]*)/);
  if (priceMatch) {
    const val = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (
      lower.includes("under") ||
      lower.includes("below") ||
      lower.includes("max") ||
      lower.includes("less than") ||
      lower.includes("budget")
    ) {
      c.maxPrice = val;
    } else if (
      lower.includes("over") ||
      lower.includes("above") ||
      lower.includes("min") ||
      lower.includes("at least")
    ) {
      c.minPrice = val;
    } else {
      c.maxPrice = val; // default to "under" when ambiguous
    }
  }

  // ── Property type ──
  if (lower.includes("apartment") || lower.includes("unit")) {
    c.propertyType = ["apartment"];
  } else if (lower.includes("house")) {
    c.propertyType = ["house"];
  } else if (lower.includes("townhouse")) {
    c.propertyType = ["townhouse"];
  }

  // ── Proximity (station / university — only if not already captured above) ──
  if (!c.proximityTo) {
    const stationMatch = lower.match(/([\w\s]+?)\s*(?:train\s*)?station/i);
    if (stationMatch) {
      const stationName = stationMatch[1].trim();
      c.proximityTo = {
        landmark: `${stationName} train station, Australia`,
        maxDistance: lower.includes("walking") ? 1 : 3,
      };
      // If no suburb was found yet, use the station name as suburb
      if (!c.suburb) {
        c.suburb = stationName.charAt(0).toUpperCase() + stationName.slice(1);
        c.state = c.state || "NSW";
      }
    } else if (lower.includes("university") || lower.includes("uni")) {
      const uniMatch = lower.match(/([\w\s]+?)\s*(?:university|uni)/i);
      if (uniMatch) {
        c.proximityTo = {
          landmark: `${uniMatch[1].trim()} university, Australia`,
          maxDistance: 3,
        };
      }
    }
  }

  // ── Features ──
  const features: string[] = [];
  if (
    lower.includes("pet-friendly") ||
    lower.includes("pet friendly") ||
    lower.includes("pets")
  )
    features.push("pet-friendly");
  if (lower.includes("parking") || lower.includes("garage"))
    features.push("parking");
  if (lower.includes("furnished")) features.push("furnished");
  if (lower.includes("pool") || lower.includes("swimming"))
    features.push("pool");
  if (features.length > 0) c.features = features;

  return c;
}

// ────────────────────────────────────────────────
// Client-side strict filters
// ────────────────────────────────────────────────

function applyStrictFilters(
  properties: PropertyListing[],
  criteria: SearchCriteria
): PropertyListing[] {
  return properties.filter((p) => {
    // Strict price ceiling
    if (criteria.maxPrice && p.price.value > 0) {
      // Normalise monthly → weekly for comparison
      const weeklyPrice =
        p.price.frequency === "monthly"
          ? Math.round(p.price.value / 4.33)
          : p.price.value;
      if (weeklyPrice > criteria.maxPrice) return false;
    }

    // Strict price floor
    if (criteria.minPrice && p.price.value > 0) {
      const weeklyPrice =
        p.price.frequency === "monthly"
          ? Math.round(p.price.value / 4.33)
          : p.price.value;
      if (weeklyPrice < criteria.minPrice) return false;
    }

    // Strict bedroom minimum
    if (criteria.minBedrooms && p.features.bedrooms < criteria.minBedrooms) {
      return false;
    }

    // Strict bedroom maximum
    if (criteria.maxBedrooms && p.features.bedrooms > criteria.maxBedrooms) {
      return false;
    }

    return true;
  });
}

// ────────────────────────────────────────────────
// Conversational response
// ────────────────────────────────────────────────

const RESPONSE_SYSTEM_PROMPT = `You are RentBot, a friendly Australian real estate assistant.

Rules:
- Keep responses to 2-3 SHORT sentences. Do NOT write essays.
- Be warm and Australian (occasional "mate", "no worries").
- When properties are found: say how many and summarise criteria. Tell the user to browse below.
- When no properties found: be empathetic, suggest ONE specific change (budget, suburb, bedrooms).
- On casual messages (hello/thanks): respond naturally, remind them to describe what they need.
- Never invent property data.
- FINISH every response with a complete sentence. Never stop mid-word.`;

async function generateResponse(
  userMessage: string,
  criteria: SearchCriteria,
  propertyCount: number,
  totalBeforeFilter: number,
  conversationHistory: ChatMessage[]
): Promise<string> {
  if (!hasAnyAIKey()) {
    return fallbackResponse(criteria, propertyCount, totalBeforeFilter);
  }

  try {
    let context: string;
    if (propertyCount > 0) {
      context = `[System: Found ${propertyCount} properties (${totalBeforeFilter} before price/bedroom filtering) matching: ${JSON.stringify(stripNulls(criteria))}]`;
    } else if (!hasAnyCriteria(criteria)) {
      context = `[System: User sent a casual message with no search intent.]`;
    } else if (totalBeforeFilter > 0) {
      context = `[System: Found ${totalBeforeFilter} properties in the area but 0 matched the strict price/bedroom filters: ${JSON.stringify(stripNulls(criteria))}. Suggest the user relax their budget or bedroom count.]`;
    } else {
      context = `[System: No properties found at all for: ${JSON.stringify(stripNulls(criteria))}. The location may be too specific or there are no current listings.]`;
    }

    const history = conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: RESPONSE_SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userMessage },
        { role: "system", content: context },
      ],
      temperature: 0.7,
      maxTokens: 400,
    });

    // Guard against truncated responses — if the last character isn't
    // sentence-ending punctuation, fall back to the reliable template.
    const text = content?.trim();
    if (!text) {
      return fallbackResponse(criteria, propertyCount, totalBeforeFilter);
    }

    // If clearly truncated (ends mid-word without punctuation), use fallback
    const lastChar = text.charAt(text.length - 1);
    if (!/[.!?…"')}\]]/.test(lastChar)) {
      console.warn("AI response appears truncated, using fallback");
      return fallbackResponse(criteria, propertyCount, totalBeforeFilter);
    }

    return text;
  } catch {
    return fallbackResponse(criteria, propertyCount, totalBeforeFilter);
  }
}

function fallbackResponse(
  criteria: SearchCriteria,
  propertyCount: number,
  totalBeforeFilter: number
): string {
  const loc = criteria.suburb || criteria.location || "your area";

  if (propertyCount > 0) {
    let summary = `Found ${propertyCount} ${propertyCount === 1 ? "property" : "properties"} in ${loc}`;
    if (criteria.maxPrice) summary += ` under $${criteria.maxPrice}/week`;
    if (criteria.minBedrooms) summary += ` with ${criteria.minBedrooms}+ bedrooms`;
    return `${summary}! Have a look below and click any card for details.`;
  }

  if (totalBeforeFilter > 0) {
    return `I found ${totalBeforeFilter} listings in ${loc}, but none matched your strict filters${criteria.maxPrice ? ` (under $${criteria.maxPrice}/week)` : ""}${criteria.minBedrooms ? ` with ${criteria.minBedrooms} bedrooms` : ""}. Try increasing your budget or adjusting bedrooms.`;
  }

  if (hasAnyCriteria(criteria)) {
    return `I couldn't find any current listings in ${loc}. Try a nearby suburb or broader area.`;
  }

  return "G'day! Tell me what you're after — like '2 bed apartment in Parramatta under $500/week' — and I'll find matching rentals for you.";
}

// ────────────────────────────────────────────────
// Follow-up suggestions
// ────────────────────────────────────────────────

export function generateFollowUpSuggestions(
  criteria: SearchCriteria,
  propertyCount: number,
  totalBeforeFilter: number
): string[] {
  const suggestions: string[] = [];

  if (propertyCount === 0) {
    if (totalBeforeFilter > 0) {
      // Had results but strict filters removed them
      if (criteria.maxPrice) {
        suggestions.push(
          `Increase budget to $${criteria.maxPrice + 100}/week`
        );
      }
      if (criteria.minBedrooms && criteria.minBedrooms > 1) {
        suggestions.push(`Try ${criteria.minBedrooms - 1} bedroom options`);
      }
    } else {
      // No results at all from API
      if (criteria.suburb) {
        suggestions.push(`Search nearby suburbs to ${criteria.suburb}`);
      }
      suggestions.push("Try a broader area (e.g. whole city)");
    }
  } else {
    if (!criteria.maxPrice) {
      suggestions.push("Set a budget — e.g. under $600/week");
    }
    if (!criteria.minBedrooms) {
      suggestions.push("Specify bedrooms — e.g. 2 bedrooms");
    }
    if (!criteria.proximityTo) {
      suggestions.push("Near a train station?");
    }
    if (propertyCount >= 6) {
      suggestions.push("Narrow results — add more criteria");
    }
  }

  return suggestions.slice(0, 3);
}

// ────────────────────────────────────────────────
// Proximity filter (Haversine)
// ────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function filterByProximity(
  properties: PropertyListing[],
  landmark: string,
  maxDistanceKm: number
): Promise<PropertyListing[]> {
  const coords = await geocodeAddress(landmark);
  if (!coords) {
    console.warn("Could not geocode landmark:", landmark);
    return properties;
  }

  return properties.filter((p) => {
    const dist = haversineKm(
      p.coordinates.latitude,
      p.coordinates.longitude,
      coords.lat,
      coords.lng
    );
    return dist <= maxDistanceKm;
  });
}

// ────────────────────────────────────────────────
// Main handler – process one user message
// ────────────────────────────────────────────────

export async function processChatMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  activeCriteria: SearchCriteria | null
): Promise<{
  responseText: string;
  properties: PropertyListing[];
  searchCriteria: SearchCriteria;
  followUpSuggestions: string[];
}> {
  // 1. Parse intent with context carry-forward
  const criteria = await parseUserIntent(
    userMessage,
    conversationHistory,
    activeCriteria
  );

  // 2. If we have a proximity target but no suburb, resolve from the landmark
  if (
    criteria.proximityTo &&
    !criteria.suburb &&
    !criteria.location
  ) {
    // Try the landmark map first
    const key = criteria.proximityTo.landmark.toLowerCase();
    for (const [keyword, info] of Object.entries(LANDMARK_TO_SUBURB)) {
      if (key.includes(keyword) || keyword.includes(key)) {
        criteria.suburb = info.suburb;
        criteria.state = info.state;
        break;
      }
    }

    // If still no suburb, try reverse-geocoding the landmark
    if (!criteria.suburb) {
      try {
        const coords = await geocodeAddress(criteria.proximityTo.landmark);
        if (coords) {
          const address = await reverseGeocode(coords.lat, coords.lng);
          if (address) {
            // Nominatim returns "Street, Suburb, City, State, Postcode, Country"
            const parts = address.split(",").map((s) => s.trim());
            // Suburb is typically the 2nd or 3rd part
            if (parts.length >= 3) {
              criteria.suburb = parts[1] || parts[2];
              // Try to find state abbreviation
              const stateMatch = address.match(
                /\b(New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Australian Capital Territory|Northern Territory)\b/i
              );
              const stateMap: Record<string, string> = {
                "new south wales": "NSW",
                victoria: "VIC",
                queensland: "QLD",
                "south australia": "SA",
                "western australia": "WA",
                tasmania: "TAS",
                "australian capital territory": "ACT",
                "northern territory": "NT",
              };
              if (stateMatch) {
                criteria.state =
                  stateMap[stateMatch[1].toLowerCase()] || "NSW";
              } else {
                criteria.state = "NSW";
              }
            }
          }
        }
      } catch (err) {
        console.warn("Reverse geocode failed for landmark:", err);
      }
    }

    // Last resort: default to Sydney CBD
    if (!criteria.suburb) {
      criteria.suburb = "Sydney";
      criteria.state = "NSW";
    }
  }

  // Search when we have a location
  let properties: PropertyListing[] = [];
  let totalBeforeFilter = 0;

  const hasSearchIntent =
    criteria.suburb || criteria.location || criteria.state;

  if (hasSearchIntent) {
    const params: SearchParams = {
      suburb: criteria.suburb ?? undefined,
      state: criteria.state ?? undefined,
      location: criteria.location ?? undefined,
      minBedrooms: criteria.minBedrooms ?? undefined,
      maxBedrooms: criteria.maxBedrooms ?? undefined,
      minPrice: criteria.minPrice ?? undefined,
      maxPrice: criteria.maxPrice ?? undefined,
      propertyType: criteria.propertyType ?? undefined,
      listingType: "rent",
    };

    try {
      properties = await searchProperties(params);
      console.log(`🏠 API returned ${properties.length} properties`);
    } catch (err) {
      console.error("Property search failed:", err);
    }

    totalBeforeFilter = properties.length;

    // 3. Client-side STRICT price & bedroom filtering
    properties = applyStrictFilters(properties, criteria);
    console.log(
      `🔍 After strict filters: ${properties.length} / ${totalBeforeFilter}`
    );

    // 4. Proximity filter — only apply if we have > 6 results to avoid
    // over-filtering when the API already returned nearby properties.
    // Also use a generous minimum of 3km since listing coordinates are often
    // approximate (suburb centroid, not exact address).
    if (criteria.proximityTo && properties.length > 6) {
      const maxDist = Math.max(criteria.proximityTo.maxDistance, 3);
      const filtered = await filterByProximity(
        properties,
        criteria.proximityTo.landmark,
        maxDist
      );
      console.log(`📍 After proximity filter: ${filtered.length} (max ${maxDist}km)`);
      // Only use proximity filter results if we still have enough
      if (filtered.length > 0) {
        properties = filtered;
      } else {
        console.log("📍 Proximity filter removed all results — keeping original set");
      }
    }

    // Limit to 6 results for chat display
    properties = properties.slice(0, 6);
  }

  // 5. Conversational response
  const responseText = await generateResponse(
    userMessage,
    criteria,
    properties.length,
    totalBeforeFilter,
    conversationHistory
  );

  // 6. Follow-up suggestions
  const followUpSuggestions = generateFollowUpSuggestions(
    criteria,
    properties.length,
    totalBeforeFilter
  );

  return {
    responseText,
    properties,
    searchCriteria: criteria,
    followUpSuggestions,
  };
}
