import axios from "axios";

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocode an address to lat/lng using Nominatim (OpenStreetMap) — no API key needed.
 */
export const geocodeAddress = async (
  address: string
): Promise<Coordinates | null> => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: `${address}, Australia`,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "SafeRentAI/1.0",
        },
      }
    );

    if (response.data?.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to address using Nominatim
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat,
          lon: lng,
          format: "json",
        },
        headers: {
          "User-Agent": "SafeRentAI/1.0",
        },
      }
    );

    return response.data?.display_name ?? null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

/**
 * Calculate approximate distance to Sydney CBD (-33.8688, 151.2093)
 */
export const distanceToCBD = (lat: number, lng: number): number => {
  const CBD_LAT = -33.8688;
  const CBD_LNG = 151.2093;
  const R = 6371; // Earth radius in km
  const dLat = ((lat - CBD_LAT) * Math.PI) / 180;
  const dLng = ((lng - CBD_LNG) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((CBD_LAT * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};
