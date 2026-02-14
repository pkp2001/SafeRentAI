import { motion } from "framer-motion";
import { Heart, Bed, Bath, Car, MapPin, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { SavedListing } from "@/types";

interface ListingCardProps {
  listing: SavedListing;
  index?: number;
  compact?: boolean;
  onSave?: (id: string) => void;
}

export function ListingCard({ listing, index = 0, compact = false, onSave }: ListingCardProps) {
  const navigate = useNavigate();

  const scamVariant = listing.scam_score < 30 ? "safe" : listing.scam_score < 60 ? "warning" : "risky";
  const scamLabel = listing.scam_score < 30 ? "Safe" : listing.scam_score < 60 ? "Moderate" : "Risky";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group rounded-xl border border-dark-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listing.image_url}
          alt={listing.property_address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Scam Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={scamVariant} className="flex items-center gap-1 shadow-lg">
            <Shield className="w-3 h-3" />
            {scamLabel} · {listing.scam_score}
          </Badge>
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(listing.id);
          }}
          className="absolute top-3 left-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
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
        <div className="flex items-center gap-3 text-dark-500 text-sm mb-2">
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
          <MapPin className="w-3.5 h-3.5 text-dark-400 mt-0.5 shrink-0" />
          <p className="text-sm text-dark-700 font-medium line-clamp-1">
            {listing.property_address}
          </p>
        </div>

        {/* Quick Stats */}
        {!compact && listing.distance_cbd !== undefined && (
          <div className="flex items-center gap-4 text-xs text-dark-400 mb-3">
            <span>{listing.distance_cbd}km to CBD</span>
            <span>{listing.property_type}</span>
          </div>
        )}

        {/* Apply Button */}
        <Button
          className="w-full"
          size={compact ? "sm" : "default"}
          onClick={() => navigate(`/apply/${listing.id}`)}
        >
          Apply Now
        </Button>
      </div>
    </motion.div>
  );
}

