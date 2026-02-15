import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSavedListings,
  saveListing,
  deleteSavedListing,
} from "@/lib/supabaseDb";
import {
  searchProperties,
  type PropertyListing,
  type SearchParams,
} from "@/lib/realtyApi";
import { fetchCrimeStats } from "@/lib/crimeData";
import { distanceToCBD } from "@/lib/geocoding";
import type { SavedListing } from "@/types";

// ─── Re-export the search param type for consumers ──────────
export type { SearchParams };

// ─── Convert a PropertyListing to our SavedListing shape ─────
function propertyToSaved(
  p: PropertyListing,
  extra: {
    scam_score: number;
    scam_flags: string[];
    safety_score?: number;
    distance_cbd?: number;
  }
): SavedListing {
  return {
    id: p.id,
    user_id: "",
    listing_url: p.listingUrl,
    property_address: p.address.fullAddress,
    rent_amount: p.price.value,
    bedrooms: p.features.bedrooms,
    bathrooms: p.features.bathrooms,
    image_url: p.images[0] || "",
    scam_score: extra.scam_score,
    scam_flags: extra.scam_flags,
    saved_at: new Date().toISOString(),
    property_type: p.features.propertyType,
    parking: p.features.parking,
    lat: p.coordinates.latitude,
    lng: p.coordinates.longitude,
    suburb: p.address.suburb,
    postcode: p.address.postcode,
    state: p.address.state,
    safety_score: extra.safety_score,
    distance_cbd: extra.distance_cbd,
    // Detail fields
    images: p.images,
    description: p.description,
    dateAvailable: p.dateAvailable,
    agent: p.agent
      ? {
          name: p.agent.name,
          phone: p.agent.phone,
        }
      : undefined,
  };
}

// ─── Fetch listings from Realty-in-AU API ────────────────────

export interface ListingFilters {
  suburb?: string;
  state?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  page?: number;
}

export function useListings(filters: ListingFilters) {
  return useQuery<SavedListing[]>({
    queryKey: ["listings", filters],
    queryFn: async () => {
      const listings = await searchProperties({
        suburb: filters.suburb,
        state: filters.state || "NSW",
        minBedrooms: filters.minBedrooms,
        maxBedrooms: filters.maxBedrooms,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        propertyType: filters.propertyTypes,
        page: filters.page || 1,
        listingType: "rent",
      });

      // Enrich listings with crime data and distance.
      // NOTE: Scam scanning is NOT done here — it uses OpenAI which has
      // strict rate limits. Scam analysis happens only when the user
      // explicitly scans a specific listing via the ScamScanner component.
      const enriched: SavedListing[] = await Promise.all(
        listings.map(async (p) => {
          let safety_score: number | undefined;
          let distance_cbd: number | undefined;

          try {
            const crime = await fetchCrimeStats(
              p.address.suburb,
              p.address.state || "NSW"
            );
            safety_score = crime?.safetyScore;
          } catch {
            /* optional */
          }

          if (p.coordinates.latitude && p.coordinates.longitude) {
            distance_cbd = distanceToCBD(
              p.coordinates.latitude,
              p.coordinates.longitude
            );
          }

          return propertyToSaved(p, {
            scam_score: 0,
            scam_flags: [],
            safety_score,
            distance_cbd,
          });
        })
      );

      return enriched;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!(filters.suburb || filters.state),
  });
}

// ─── Saved listings (from Supabase) ──────────────────────────

export function useSavedListings() {
  return useQuery<SavedListing[]>({
    queryKey: ["saved-listings"],
    queryFn: getSavedListings,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (listing: Omit<SavedListing, "id" | "user_id" | "saved_at">) =>
      saveListing(listing),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-listings"] });
    },
  });
}

export function useDeleteSavedListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => deleteSavedListing(listingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-listings"] });
    },
  });
}
