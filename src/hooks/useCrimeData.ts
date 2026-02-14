import { useQuery } from "@tanstack/react-query";
import { fetchCrimeStats, type CrimeStats } from "@/lib/crimeData";

/**
 * Fetch live crime statistics for a suburb.
 *
 * Data is fetched via OpenAI (when key is available) or
 * estimated deterministically as a fallback. Results are
 * cached both in React Query (10 min stale) and in the
 * crimeData in-memory cache so synchronous reads work too.
 */
export function useCrimeData(suburb: string | undefined, state = "NSW") {
  return useQuery<CrimeStats | null>({
    queryKey: ["crime-data", suburb?.toLowerCase(), state.toLowerCase()],
    queryFn: () => fetchCrimeStats(suburb!, state),
    enabled: !!suburb,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

