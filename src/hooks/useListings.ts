import { useState, useMemo } from "react";
import { mockListings } from "@/lib/mockData";
import type { SavedListing, FilterState } from "@/types";

const defaultFilters: FilterState = {
  location: "",
  minPrice: 0,
  maxPrice: 1000,
  bedrooms: "any",
  propertyType: [],
  petFriendly: false,
  furnished: false,
  parking: false,
  scamFreeOnly: false,
};

export function useListings() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isLoading] = useState(false);

  const listings = useMemo(() => {
    let filtered = [...mockListings];

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.property_address.toLowerCase().includes(loc) ||
          l.suburb?.toLowerCase().includes(loc)
      );
    }

    if (filters.minPrice > 0) {
      filtered = filtered.filter((l) => l.rent_amount >= filters.minPrice);
    }

    if (filters.maxPrice < 1000) {
      filtered = filtered.filter((l) => l.rent_amount <= filters.maxPrice);
    }

    if (filters.bedrooms !== "any") {
      const beds = filters.bedrooms === "4+" ? 4 : parseInt(filters.bedrooms);
      if (filters.bedrooms === "4+") {
        filtered = filtered.filter((l) => l.bedrooms >= beds);
      } else {
        filtered = filtered.filter((l) => l.bedrooms === beds);
      }
    }

    if (filters.propertyType.length > 0) {
      filtered = filtered.filter((l) =>
        filters.propertyType.includes(l.property_type || "")
      );
    }

    if (filters.petFriendly) {
      filtered = filtered.filter((l) => l.pet_friendly);
    }

    if (filters.furnished) {
      filtered = filtered.filter((l) => l.furnished);
    }

    if (filters.parking) {
      filtered = filtered.filter((l) => (l.parking || 0) > 0);
    }

    if (filters.scamFreeOnly) {
      filtered = filtered.filter((l) => l.scam_score < 30);
    }

    return filtered;
  }, [filters]);

  const resetFilters = () => setFilters(defaultFilters);

  const toggleSaved = (_listingId: string) => {
    // In a real app, this would save/unsave to Supabase
  };

  return {
    listings,
    allListings: mockListings as SavedListing[],
    isLoading,
    filters,
    setFilters,
    resetFilters,
    toggleSaved,
  };
}

