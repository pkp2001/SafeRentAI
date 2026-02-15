import { motion } from "framer-motion";
import { Heart, Bed, Bath, Car, MapPin, Shield, ShieldCheck, ShieldAlert, CircleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getCrimeStats, getSafetyLevel } from "@/lib/crimeData";
import { useTheme } from "@/hooks/useTheme";
import type { SavedListing } from "@/types";

interface ListingCardProps {
  listing: SavedListing;
  index?: number;
  compact?: boolean;
  onSave?: (id: string) => void;
}

export function ListingCard({ listing, index = 0, compact = false, onSave }: ListingCardProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const scamVariant = listing.scam_score < 30 ? "safe" : listing.scam_score < 60 ? "warning" : "risky";
  const scamLabel = listing.scam_score < 30 ? "Safe" : listing.scam_score < 60 ? "Moderate" : "Risky";

  // Use the pre-fetched safety_score from the listing (populated by useListings).
  // Falls back to the in-memory cache from crimeData.ts.
  const crimeStats = getCrimeStats(listing.suburb || listing.property_address);
  const score = listing.safety_score ?? crimeStats?.safetyScore;
  const safety = score != null ? getSafetyLevel(score) : null;

  const openDetail = () => {
    navigate(`/listing/${listing.id}`, {
      state: {
        listing,
        images: listing.images || (listing.image_url ? [listing.image_url] : []),
        description: listing.description || "",
        dateAvailable: listing.dateAvailable,
        agent: listing.agent,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4 }}
      onClick={openDetail}
      className="group cursor-pointer rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-primary-900/10 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listing.image_url}
          alt={listing.property_address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            // Try without size prefix as fallback, then placeholder
            if (!target.dataset.retried) {
              target.dataset.retried = "1";
              target.src = listing.image_url.replace(/\/\d+x\d+\//, "/");
            } else {
              target.src = "https://via.placeholder.com/800x600?text=No+Image";
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Safety Badge */}
        {safety && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full backdrop-blur-sm text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors duration-300"
            style={{
              backgroundColor: theme === "dark" ? safety.darkBgColor : safety.bgColor,
              color: theme === "dark" ? safety.darkColor : safety.color,
              border: `1px solid ${theme === "dark" ? safety.darkColor : safety.color}40`,
            }}
          >
            <Shield className="w-3 h-3" />
            {safety.label}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(listing.id);
          }}
          className={`absolute ${safety ? "bottom-12 right-3" : "top-3 left-3"} p-2 rounded-full bg-white/80 dark:bg-dark-700/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-600 transition-colors shadow-lg`}
        >
          <Heart className="w-4 h-4 text-dark-600 hover:text-danger-500 transition-colors" />
        </button>

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <span className="text-2xl font-bold text-white drop-shadow-lg">
            {formatCurrency(listing.rent_amount)}
          </span>
          <span className="text-white/80 text-sm">/week</span>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${compact ? "p-3" : "p-4"}`}>
        {/* Details */}
        <div className="flex items-center gap-3 text-dark-500 dark:text-dark-400 text-sm mb-2">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" />
            {listing.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {listing.bathrooms}
          </span>
          {(listing.parking || 0) > 0 && (
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" />
              {listing.parking}
            </span>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-1.5 mb-3">
          <MapPin className="w-3.5 h-3.5 text-dark-400 dark:text-dark-500 mt-0.5 shrink-0" />
          <p className="text-sm text-dark-700 dark:text-dark-200 font-medium line-clamp-1">
            {listing.property_address}
          </p>
        </div>

        {/* Scam Verification Indicator */}
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-3 px-2.5 py-1.5 rounded-lg w-fit ${
          listing.scam_score < 30
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : listing.scam_score < 60
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
        }`}>
          {listing.scam_score < 30 ? (
            <ShieldCheck className="w-3.5 h-3.5" />
          ) : listing.scam_score < 60 ? (
            <ShieldAlert className="w-3.5 h-3.5" />
          ) : (
            <CircleAlert className="w-3.5 h-3.5" />
          )}
          {listing.scam_score < 30
            ? "Verified Listing"
            : listing.scam_score < 60
              ? "Review Advised"
              : "Potential Scam"}
        </div>

        {/* Quick Stats */}
        {!compact && listing.distance_cbd !== undefined && (
          <div className="flex items-center gap-4 text-xs text-dark-400 dark:text-dark-500 mb-3">
            <span>{listing.distance_cbd}km to CBD</span>
            <span>{listing.property_type}</span>
          </div>
        )}

        {/* Apply Button */}
        <Button
          className="w-full"
          size={compact ? "sm" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/apply/${listing.id}`, { state: { listing } });
          }}
        >
          Apply Now
        </Button>
      </div>
    </motion.div>
  );
}

