import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ApplicationWizard } from "@/components/features/ApplicationWizard";
import { CrimeDetailsPanel } from "@/components/features/CrimeDetailsPanel";
import { mockListings } from "@/lib/mockData";
import { getCrimeStats } from "@/lib/crimeData";

export default function Apply() {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = mockListings.find((l) => l.id === listingId);
  const crimeStats = listing
    ? getCrimeStats(listing.suburb || listing.property_address)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-dark-100">Apply for Property</h1>
        <p className="text-dark-500 dark:text-dark-300">
          Complete the form below to submit your rental application
        </p>
      </div>

      {crimeStats && <CrimeDetailsPanel crimeStats={crimeStats} />}

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-sm p-6 sm:p-8 mt-6">
        <ApplicationWizard listing={listing} />
      </div>
    </motion.div>
  );
}

