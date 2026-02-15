import axios from "axios";

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST =
  import.meta.env.VITE_RAPIDAPI_HOST || "realty-in-au.p.rapidapi.com";

if (!RAPIDAPI_KEY) {
  console.warn("⚠️ VITE_RAPIDAPI_KEY is not set in .env file");
}

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface PropertyListing {
  id: string;
  listingType: "rent" | "sale";
  price: {
    display: string;
    value: number;
    frequency?: "weekly" | "monthly";
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    fullAddress: string;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    parking: number;
    propertyType: string;
  };
  title: string;
  description: string;
  images: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  listingUrl: string;
  dateAvailable?: string;
  agent?: {
    name: string;
    phone?: string;
    agency?: string;
  };
}

export interface SearchParams {
  location?: string;
  state?: string;
  suburb?: string;
  postcode?: string;
  listingType?: "rent" | "sale";
  minBedrooms?: number;
  maxBedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  page?: number;
  pageSize?: number;
  sortType?: string;
}

// ────────────────────────────────────────────────
// API helpers
// ────────────────────────────────────────────────

const apiHeaders = () => ({
  "X-RapidAPI-Key": RAPIDAPI_KEY!,
  "X-RapidAPI-Host": RAPIDAPI_HOST,
});

// ────────────────────────────────────────────────
// Auto-complete — resolve a search query to a
// location descriptor the properties endpoint needs
// ────────────────────────────────────────────────

interface LocationSuggestion {
  displayText: string;
  displaySubtext: string;
  type: string; // "region" | "suburb" | "postcode"
  suburb: string;
  state: string;
  postcode: string;
}

export const searchLocations = async (
  query: string
): Promise<LocationSuggestion[]> => {
  if (!RAPIDAPI_KEY || !query.trim()) return [];

  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/auto-complete`,
      {
        params: { query },
        headers: apiHeaders(),
      }
    );

    const suggestions =
      response.data?._embedded?.suggestions ?? [];
    if (!Array.isArray(suggestions)) return [];

    return suggestions.map((s: any) => ({
      displayText: s.display?.text || "",
      displaySubtext: s.display?.subtext || "",
      type: s.type || "suburb",
      suburb: s.source?.name || "",
      state: s.source?.state || "",
      postcode: s.source?.postcode || "",
    }));
  } catch (error) {
    console.error("Location autocomplete error:", error);
    return [];
  }
};

// ────────────────────────────────────────────────
// Search properties
// ────────────────────────────────────────────────

export const searchProperties = async (
  params: SearchParams
): Promise<PropertyListing[]> => {
  if (!RAPIDAPI_KEY) {
    console.error("VITE_RAPIDAPI_KEY not set — cannot fetch listings");
    return [];
  }

  try {
    // Step 1 — resolve the user query to a location descriptor via auto-complete
    const query =
      params.location ||
      (params.suburb && params.state
        ? `${params.suburb}, ${params.state}`
        : params.suburb || params.state || "Sydney");

    const suggestions = await searchLocations(query);

    if (suggestions.length === 0) {
      console.warn("No locations matched for:", query);
      return [];
    }

    // Prefer region > suburb > anything else for broader results
    const loc =
      suggestions.find((s) => s.type === "region") || suggestions[0];

    // Step 2 — fetch properties
    const requestParams: Record<string, string | number | boolean> = {
      searchLocation: loc.displayText,
      searchLocationSubtext: loc.displaySubtext,
      type: loc.type,
      channel: params.listingType === "sale" ? "buy" : "rent",
      page: params.page || 1,
      pageSize: params.pageSize || 30,
      sortType: params.sortType || "relevance",
      surroundingSuburbs: true,
      "ex-under-contract": false,
    };

    if (params.minBedrooms) requestParams.minimumBedrooms = params.minBedrooms;
    if (params.maxBedrooms) requestParams.maximumBedrooms = params.maxBedrooms;
    if (params.minPrice) requestParams.minPrice = params.minPrice;
    if (params.maxPrice) requestParams.maxPrice = params.maxPrice;

    console.log("🔍 Searching Realty-in-AU:", requestParams);

    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/properties/list`,
      {
        params: requestParams,
        headers: apiHeaders(),
      }
    );

    // Listings live inside tieredResults[].results[]
    const tieredResults = response.data?.tieredResults ?? [];
    const allResults: any[] = [];
    for (const tier of tieredResults) {
      if (Array.isArray(tier.results)) {
        allResults.push(...tier.results);
      }
    }

    console.log(
      "✅ Received",
      allResults.length,
      "listings (total:",
      response.data?.totalResultsCount ?? "?",
      ")"
    );

    return allResults.map(transformListing);
  } catch (error: any) {
    console.error(
      "❌ Realty-in-AU API error:",
      error.response?.data || error.message
    );

    if (error.response?.status === 429) {
      throw new Error("API rate limit reached. Please try again later.");
    }
    if (error.response?.status === 403) {
      throw new Error(
        "API key invalid. Please check your VITE_RAPIDAPI_KEY in .env file."
      );
    }

    throw new Error("Failed to fetch property listings. Please try again.");
  }
};

// ────────────────────────────────────────────────
// Get property details
// ────────────────────────────────────────────────

export const getPropertyDetails = async (
  propertyId: string
): Promise<PropertyListing | null> => {
  if (!RAPIDAPI_KEY) return null;

  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/properties/detail`,
      {
        params: { id: propertyId },
        headers: apiHeaders(),
      }
    );

    if (!response.data) return null;
    return transformListing(response.data);
  } catch (error) {
    console.error("Realty-in-AU property details error:", error);
    return null;
  }
};

// ────────────────────────────────────────────────
// Transform raw API listing → PropertyListing
// ────────────────────────────────────────────────

const transformListing = (raw: any): PropertyListing => {
  // ── Price ──
  let priceValue = 0;
  const priceDisplay: string = raw.price?.display || "$0";
  let priceFrequency: "weekly" | "monthly" = "weekly";

  if (priceDisplay) {
    const digits = priceDisplay.replace(/[^0-9]/g, "");
    if (digits) priceValue = parseInt(digits, 10);
    if (priceDisplay.toLowerCase().includes("month")) {
      priceFrequency = "monthly";
    }
  }

  // ── Address ──
  const addr = raw.address || {};
  const street = addr.streetAddress || "";
  const suburb = addr.suburb || addr.locality || "";
  const state = addr.state || addr.subdivisionCode || "NSW";
  const postcode = addr.postcode || addr.postCode || "";
  const fullAddress = [street, suburb, state, postcode]
    .filter(Boolean)
    .join(", ");

  // ── Features ──
  const gen = raw.features?.general || {};
  const genAlt = raw.generalFeatures || {};
  const bedrooms =
    gen.bedrooms ?? genAlt.bedrooms?.value ?? 0;
  const bathrooms =
    gen.bathrooms ?? genAlt.bathrooms?.value ?? 0;
  const parking =
    gen.parkingSpaces ?? genAlt.parkingSpaces?.value ?? 0;

  // ── Images ──
  // The CDN requires a size prefix in the path: /800x600/{hash}/image.jpg
  const buildImageUrl = (
    server: string,
    uri: string,
    width = 800,
    height = 600
  ): string => {
    // uri looks like "/{hash}/image.jpg"
    // Insert size prefix after the server: server + /WxH + uri
    return `${server}/${width}x${height}${uri}`;
  };

  const images: string[] = [];
  if (raw.mainImage?.server && raw.mainImage?.uri) {
    images.push(buildImageUrl(raw.mainImage.server, raw.mainImage.uri));
  }
  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (img.server && img.uri && img.name !== "floorplan") {
        images.push(buildImageUrl(img.server, img.uri));
      }
    }
  }
  if (images.length === 0) {
    images.push("https://via.placeholder.com/800x600?text=No+Image");
  }

  // ── Listing URL ──
  const listingUrl = raw.prettyUrl
    ? `https://www.realestate.com.au/${raw.prettyUrl}`
    : "#";

  // ── Agent ──
  const lister = raw.lister || raw.listers?.[0];

  return {
    id: String(raw.listingId || raw.id || Math.random().toString(36).slice(2)),
    listingType: raw.channel === "buy" ? "sale" : "rent",
    price: {
      display: priceDisplay,
      value: priceValue,
      frequency: priceFrequency,
    },
    address: { street, suburb, state, postcode, fullAddress },
    features: {
      bedrooms,
      bathrooms,
      parking,
      propertyType: raw.propertyType || "House",
    },
    title: raw.title || "",
    description: (raw.description || "").replace(/<br\s*\/?>/gi, "\n"),
    images,
    coordinates: {
      latitude: addr.location?.latitude ?? -33.8688,
      longitude: addr.location?.longitude ?? 151.2093,
    },
    listingUrl,
    dateAvailable:
      raw.dateAvailable?.dateDisplay || raw.dateAvailable?.date,
    agent: lister
      ? {
          name: lister.name || "Agent",
          phone: lister.phoneNumber || lister.mobilePhoneNumber,
          agency: raw.agency?.name,
        }
      : undefined,
  };
};

// ────────────────────────────────────────────────
// Format price helper
// ────────────────────────────────────────────────

export const formatListingPrice = (listing: PropertyListing): string => {
  const { value, frequency } = listing.price;
  if (value === 0) return "Contact Agent";

  const formatted = `$${value.toLocaleString()}`;
  if (listing.listingType === "rent") {
    return frequency === "monthly"
      ? `${formatted}/month`
      : `${formatted}/week`;
  }
  return formatted;
};
