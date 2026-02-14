import { useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ApplicationWizard } from "@/components/features/ApplicationWizard";
import { CrimeDetailsPanel } from "@/components/features/CrimeDetailsPanel";
import { useCrimeData } from "@/hooks/useCrimeData";
import { useSavedListings } from "@/hooks/useListings";
import type { SavedListing } from "@/types";

export default function Apply() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();

  // 1. Prefer listing passed via route state (from ListingCard / ListingDetail)
  const stateListing: SavedListing | undefined = location.state?.listing;

  // 2. Fall back to saved listings from Supabase (for bookmarked / saved properties)
  const { data: savedListings, isLoading: savedLoading } = useSavedListings();
  const dbListing = (savedListings || []).find((l) => l.id === listingId);

  // Use whichever source has data
  const listing = stateListing || dbListing;

  // Fetch crime data for the suburb
  const { data: crimeStats } = useCrimeData(
    listing?.suburb || "",
    listing?.state || "NSW"
  );

  // Only show the loader if we have no listing from state and are still fetching from DB
  const isLoading = !stateListing && savedLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-dark-100">Apply for Property</h1>
        {listing && (
          <p className="text-dark-500 dark:text-dark-300">
            {listing.property_address}
            {listing.rent_amount ? ` — $${listing.rent_amount}/week` : ""}
          </p>
        )}
        {!listing && !isLoading && (
          <p className="text-dark-500 dark:text-dark-300">
            Complete the form below to submit your rental application
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {crimeStats && <CrimeDetailsPanel crimeStats={crimeStats} />}

          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-sm p-6 sm:p-8 mt-6">
            <ApplicationWizard listing={listing} />
          </div>
        </>
      )}
    </motion.div>
  );
}
