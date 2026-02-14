import axios from "axios";
import {
  searchProperties,
  type PropertyListing,
  type SearchParams,
} from "@/lib/realtyApi";
import { geocodeAddress } from "@/lib/geocoding";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_BASE = "https://api.openai.com/v1";

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
// Intent parsing
// ────────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = `You are an Australian real estate assistant. Extract rental search criteria from the user message.

Respond ONLY with valid JSON matching this schema:
{
  "location": "suburb, state" or null,
  "suburb": "suburb name" or null,
  "state": "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT" or null,
  "minBedrooms": number or null,
  "maxBedrooms": number or null,
  "minPrice": number (weekly rent) or null,
  "maxPrice": number (weekly rent) or null,
  "propertyType": ["house","apartment","townhouse","unit"] or null,
  "proximityTo": {"landmark":"string","maxDistance":number_km} or null,
  "features": ["pet-friendly","parking","furnished","pool"] or null
}

If the message is casual conversation (e.g. "hello", "thanks") and contains no search criteria, return an empty object: {}

Interpret Australian conventions:
- Weekly rent is the norm (e.g. "$500/week", "under 500" means maxPrice=500)
- "Near X station" → proximityTo with maxDistance 2km
- "Walking distance to X" → proximityTo with maxDistance 1km
- Default state to NSW if suburb is in Sydney metro
- "unit" and "apartment" are equivalent`;

export async function parseUserIntent(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<SearchCriteria> {
  if (!OPENAI_API_KEY) return extractKeywordsFallback(userMessage);

  try {
    const history = conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: INTENT_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const parsed = JSON.parse(
      response.data.choices[0].message.content || "{}"
    );
    console.log("🤖 Parsed search criteria:", parsed);
    return parsed;
  } catch (err) {
    console.warn("Intent parsing failed, using keyword fallback:", err);
    return extractKeywordsFallback(userMessage);
  }
}

// ────────────────────────────────────────────────
// Keyword fallback
// ────────────────────────────────────────────────

function extractKeywordsFallback(message: string): SearchCriteria {
  const c: SearchCriteria = {};
  const lower = message.toLowerCase();

  // Suburbs
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
    surry: "NSW",
    newtown: "NSW",
    melbourne: "VIC",
    richmond: "VIC",
    brisbane: "QLD",
    adelaide: "SA",
    perth: "WA",
  };

  for (const [sub, st] of Object.entries(knownSuburbs)) {
    if (lower.includes(sub)) {
      c.suburb = sub.charAt(0).toUpperCase() + sub.slice(1);
      c.state = st;
      break;
    }
  }

  // Bedrooms
  const bedMatch = lower.match(/(\d+)\s*(?:bed|bedroom|br)/);
  if (bedMatch) {
    const n = parseInt(bedMatch[1], 10);
    c.minBedrooms = n;
    c.maxBedrooms = n;
  }

  // Price
  const priceMatch = lower.match(/\$\s*(\d[\d,]*)/);
  if (priceMatch) {
    const val = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (lower.includes("under") || lower.includes("below") || lower.includes("max") || lower.includes("less than")) {
      c.maxPrice = val;
    } else if (lower.includes("over") || lower.includes("above") || lower.includes("min")) {
      c.minPrice = val;
    } else {
      c.maxPrice = val;
    }
  }

  // Property type
  if (lower.includes("apartment") || lower.includes("unit")) {
    c.propertyType = ["apartment"];
  } else if (lower.includes("house")) {
    c.propertyType = ["house"];
  } else if (lower.includes("townhouse")) {
    c.propertyType = ["townhouse"];
  }

  // Proximity
  const stationMatch = lower.match(/([\w\s]+?)\s*(?:train\s*)?station/i);
  if (stationMatch) {
    c.proximityTo = {
      landmark: `${stationMatch[1].trim()} train station`,
      maxDistance: lower.includes("walking") ? 1 : 2,
    };
  } else if (lower.includes("university") || lower.includes("uni")) {
    const uniMatch = lower.match(/([\w\s]+?)\s*(?:university|uni)/i);
    if (uniMatch) {
      c.proximityTo = {
        landmark: `${uniMatch[1].trim()} university`,
        maxDistance: 2,
      };
    }
  }

  // Features
  const features: string[] = [];
  if (lower.includes("pet-friendly") || lower.includes("pet friendly") || lower.includes("pets")) features.push("pet-friendly");
  if (lower.includes("parking") || lower.includes("garage")) features.push("parking");
  if (lower.includes("furnished")) features.push("furnished");
  if (lower.includes("pool") || lower.includes("swimming")) features.push("pool");
  if (features.length > 0) c.features = features;

  return c;
}

// ────────────────────────────────────────────────
// Conversational response
// ────────────────────────────────────────────────

const RESPONSE_SYSTEM_PROMPT = `You are RentBot, a friendly Australian real estate assistant inside the SafeRent AI app.

Rules:
- Be concise (2-3 sentences max)
- Be warm and naturally Australian (occasional "mate", "no worries")
- When properties are found: celebrate and tell the user to browse them below
- When no properties found: be empathetic and suggest alternatives
- When message is casual (hello/thanks): respond naturally, remind them how to search
- Never invent property data
- Always mention the count of properties found`;

async function generateResponse(
  userMessage: string,
  criteria: SearchCriteria,
  propertyCount: number,
  conversationHistory: ChatMessage[]
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return fallbackResponse(criteria, propertyCount);
  }

  try {
    const context =
      propertyCount > 0
        ? `[System: Found ${propertyCount} properties matching: ${JSON.stringify(criteria)}]`
        : Object.keys(criteria).length === 0
          ? `[System: User sent a casual message with no search intent.]`
          : `[System: No properties found for: ${JSON.stringify(criteria)}]`;

    const history = conversationHistory.slice(-4).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: RESPONSE_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessage },
          { role: "system", content: context },
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return (
      response.data.choices[0].message.content?.trim() ||
      fallbackResponse(criteria, propertyCount)
    );
  } catch {
    return fallbackResponse(criteria, propertyCount);
  }
}

function fallbackResponse(
  criteria: SearchCriteria,
  propertyCount: number
): string {
  if (propertyCount > 0) {
    const loc = criteria.suburb || criteria.location || "your area";
    return `Found ${propertyCount} ${propertyCount === 1 ? "property" : "properties"} in ${loc}! Have a look below and click any card for details.`;
  }
  if (Object.keys(criteria).length > 0) {
    return "I couldn't find exact matches — try broadening your search (higher budget, fewer bedrooms, or a nearby suburb).";
  }
  return "G'day! Tell me what you're after — like '2 bed apartment in Parramatta under $500/week' — and I'll find matching rentals for you.";
}

// ────────────────────────────────────────────────
// Follow-up suggestions
// ────────────────────────────────────────────────

export function generateFollowUpSuggestions(
  criteria: SearchCriteria,
  propertyCount: number
): string[] {
  const suggestions: string[] = [];

  if (propertyCount === 0) {
    if (criteria.maxPrice) {
      suggestions.push(`Increase budget to $${criteria.maxPrice + 100}/week`);
    }
    if (criteria.minBedrooms && criteria.minBedrooms > 1) {
      suggestions.push(`Try ${criteria.minBedrooms - 1} bedroom options`);
    }
    if (criteria.suburb) {
      suggestions.push(`Search nearby suburbs to ${criteria.suburb}`);
    }
    if (suggestions.length === 0) {
      suggestions.push("Try a different suburb");
    }
  } else {
    if (!criteria.maxPrice) {
      suggestions.push("Filter by price — e.g. under $600/week");
    }
    if (!criteria.minBedrooms) {
      suggestions.push("Specify bedrooms — e.g. 2 bedrooms");
    }
    if (!criteria.proximityTo) {
      suggestions.push("Near a train station?");
    }
    if (propertyCount > 6) {
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
  conversationHistory: ChatMessage[]
): Promise<{
  responseText: string;
  properties: PropertyListing[];
  searchCriteria: SearchCriteria;
  followUpSuggestions: string[];
}> {
  // 1. Parse intent
  const criteria = await parseUserIntent(userMessage, conversationHistory);

  // 2. Search when we have a location
  let properties: PropertyListing[] = [];

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
    } catch (err) {
      console.error("Property search failed:", err);
    }

    // 3. Proximity filter
    if (criteria.proximityTo && properties.length > 0) {
      properties = await filterByProximity(
        properties,
        criteria.proximityTo.landmark,
        criteria.proximityTo.maxDistance
      );
    }

    // Limit to 6 results for chat display
    properties = properties.slice(0, 6);
  }

  // 4. Conversational response
  const responseText = await generateResponse(
    userMessage,
    criteria,
    properties.length,
    conversationHistory
  );

  // 5. Follow-up suggestions
  const followUpSuggestions = generateFollowUpSuggestions(
    criteria,
    properties.length
  );

  return { responseText, properties, searchCriteria: criteria, followUpSuggestions };
}

