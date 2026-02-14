import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ApplicationWizard } from "@/components/features/ApplicationWizard";
import { mockListings } from "@/lib/mockData";

export default function Apply() {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = mockListings.find((l) => l.id === listingId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Apply for Property</h1>
        <p className="text-dark-500">
          Complete the form below to submit your rental application
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-dark-100 shadow-sm p-6 sm:p-8">
        <ApplicationWizard listing={listing} />
      </div>
    </motion.div>
  );
}

