import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bed,
  Bath,
  Car,
  MapPin,
  Shield,
  ExternalLink,
  Calendar,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrimeDetailsPanel } from "@/components/features/CrimeDetailsPanel";
import { formatCurrency } from "@/lib/utils";
import { getSafetyLevel } from "@/lib/crimeData";
import { useCrimeData } from "@/hooks/useCrimeData";
import { useTheme } from "@/hooks/useTheme";
import type { SavedListing } from "@/types";

export default function ListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Listing data passed via route state
  const listing = location.state?.listing as SavedListing | undefined;
  // Extra images passed alongside
  const allImages = (location.state?.images as string[]) || [];

  const [currentImage, setCurrentImage] = useState(0);

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 dark:text-dark-100">
          Listing Not Found
        </h1>
        <p className="text-dark-500 dark:text-dark-400 mb-6">
          This listing may have been removed or the link is invalid.
        </p>
        <Button onClick={() => navigate("/search")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const images =
    allImages.length > 0
      ? allImages
      : listing.image_url
        ? [listing.image_url]
        : ["https://via.placeholder.com/800x600?text=No+Image"];

  const { data: crimeStats, isLoading: crimeLoading } = useCrimeData(
    listing.suburb || listing.property_address,
    listing.state || "NSW"
  );
  const safety = crimeStats ? getSafetyLevel(crimeStats.safetyScore) : null;

  const scamVariant =
    listing.scam_score < 30
      ? "safe"
      : listing.scam_score < 60
        ? "warning"
        : "risky";
  const scamLabel =
    listing.scam_score < 30
      ? "Safe"
      : listing.scam_score < 60
        ? "Moderate Risk"
        : "High Risk";

  const prevImage = () =>
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-dark-50/30 dark:bg-dark-900">
      {/* Back bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg border-b border-dark-200 dark:border-dark-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* ─── Left column: Images + Details ─── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image gallery */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden bg-dark-100 dark:bg-dark-800 aspect-[4/3]"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={images[currentImage]}
                  alt={`${listing.property_address} - Photo ${currentImage + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "1";
                      target.src = images[currentImage].replace(
                        /\/\d+x\d+\//,
                        "/"
                      );
                    } else {
                      target.src =
                        "https://via.placeholder.com/800x600?text=No+Image";
                    }
                  }}
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-dark-700 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-dark-700 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </motion.div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.slice(0, 10).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      i === currentImage
                        ? "border-primary-500 shadow-md"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const t = e.currentTarget;
                        if (!t.dataset.retried) {
                          t.dataset.retried = "1";
                          t.src = img.replace(/\/\d+x\d+\//, "/");
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6"
            >
              <h2 className="text-lg font-semibold mb-4 dark:text-dark-100">
                About this property
              </h2>
              {location.state?.description ? (
                <p className="text-sm text-dark-600 dark:text-dark-300 leading-relaxed whitespace-pre-line">
                  {location.state.description}
                </p>
              ) : (
                <p className="text-sm text-dark-400 dark:text-dark-500 italic">
                  No description available. View on the original listing for more
                  details.
                </p>
              )}
            </motion.div>

            {/* Crime data */}
            {crimeLoading ? (
              <div className="p-6 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-dark-300 dark:text-dark-600" />
                  <div className="h-5 bg-dark-200 dark:bg-dark-700 rounded w-48" />
                </div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-dark-100 dark:bg-dark-700 rounded w-28" />
                      <div className="h-4 bg-dark-100 dark:bg-dark-700 rounded w-16" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-dark-400 mt-4">Loading live crime data…</p>
              </div>
            ) : crimeStats ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CrimeDetailsPanel crimeStats={crimeStats} />
              </motion.div>
            ) : null}
          </div>

          {/* ─── Right column: Summary sidebar ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price + Key info card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6 space-y-5 sticky top-20"
            >
              {/* Price */}
              <div>
                <span className="text-3xl font-bold dark:text-dark-100">
                  {formatCurrency(listing.rent_amount)}
                </span>
                <span className="text-dark-500 dark:text-dark-400 text-lg">
                  /week
                </span>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-dark-400 mt-0.5 shrink-0" />
                <p className="text-dark-700 dark:text-dark-200 font-medium">
                  {listing.property_address}
                </p>
              </div>

              {/* Features */}
              <div className="flex items-center gap-5 py-4 border-y border-dark-200 dark:border-dark-700">
                <div className="text-center">
                  <Bed className="w-5 h-5 mx-auto text-dark-400 mb-1" />
                  <p className="text-lg font-semibold dark:text-dark-100">
                    {listing.bedrooms}
                  </p>
                  <p className="text-xs text-dark-400">Beds</p>
                </div>
                <div className="text-center">
                  <Bath className="w-5 h-5 mx-auto text-dark-400 mb-1" />
                  <p className="text-lg font-semibold dark:text-dark-100">
                    {listing.bathrooms}
                  </p>
                  <p className="text-xs text-dark-400">Baths</p>
                </div>
                {(listing.parking || 0) > 0 && (
                  <div className="text-center">
                    <Car className="w-5 h-5 mx-auto text-dark-400 mb-1" />
                    <p className="text-lg font-semibold dark:text-dark-100">
                      {listing.parking}
                    </p>
                    <p className="text-xs text-dark-400">Parking</p>
                  </div>
                )}
              </div>

              {/* Property type + extras */}
              <div className="space-y-3 text-sm">
                {listing.property_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500 dark:text-dark-400">
                      Property Type
                    </span>
                    <span className="font-medium dark:text-dark-200 capitalize">
                      {listing.property_type}
                    </span>
                  </div>
                )}
                {listing.distance_cbd !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500 dark:text-dark-400">
                      Distance to CBD
                    </span>
                    <span className="font-medium dark:text-dark-200">
                      {listing.distance_cbd} km
                    </span>
                  </div>
                )}
                {location.state?.dateAvailable && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500 dark:text-dark-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Available
                    </span>
                    <span className="font-medium dark:text-dark-200">
                      {location.state.dateAvailable}
                    </span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={scamVariant}
                  className="flex items-center gap-1"
                >
                  {listing.scam_score < 30 ? (
                    <Shield className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {scamLabel} · {listing.scam_score}
                </Badge>
                {safety && (
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                    style={{
                      backgroundColor:
                        theme === "dark"
                          ? safety.darkBgColor
                          : safety.bgColor,
                      color:
                        theme === "dark" ? safety.darkColor : safety.color,
                      border: `1px solid ${theme === "dark" ? safety.darkColor : safety.color}40`,
                    }}
                  >
                    <Shield className="w-3 h-3" />
                    {safety.label} Area
                  </div>
                )}
              </div>

              {/* Agent info */}
              {location.state?.agent && (
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700 space-y-2">
                  <p className="text-xs text-dark-400 dark:text-dark-500 font-semibold uppercase tracking-wider">
                    Listed by
                  </p>
                  <p className="text-sm font-medium dark:text-dark-200">
                    {location.state.agent.name}
                  </p>
                  {location.state.agent.agency && (
                    <p className="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {location.state.agent.agency}
                    </p>
                  )}
                  {location.state.agent.phone && (
                    <a
                      href={`tel:${location.state.agent.phone}`}
                      className="inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {location.state.agent.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() =>
                    navigate(`/apply/${listing.id}`, {
                      state: { listing },
                    })
                  }
                >
                  Apply Now
                </Button>
                {listing.listing_url && listing.listing_url !== "#" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open(listing.listing_url, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original Listing
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

