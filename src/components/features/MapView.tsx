import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { motion } from "framer-motion";
import { MapPin, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getCrimeStats, getSafetyLevel } from "@/lib/crimeData";
import { useTheme } from "@/hooks/useTheme";
import type { SavedListing } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createColoredIcon = (color: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const getMarkerIcon = (scamScore: number) => {
  if (scamScore < 30) return createColoredIcon("#10B981");
  if (scamScore < 60) return createColoredIcon("#F59E0B");
  return createColoredIcon("#EF4444");
};

const getSafetyMarkerIcon = (listing: SavedListing, isDark: boolean) => {
  const stats = getCrimeStats(listing.suburb || listing.property_address);
  if (!stats) return getMarkerIcon(listing.scam_score);
  const safety = getSafetyLevel(stats.safetyScore);
  return createColoredIcon(isDark ? safety.darkColor : safety.color);
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

interface MapViewProps {
  listings: SavedListing[];
  onListingClick?: (listing: SavedListing) => void;
  center?: [number, number];
}

export function MapView({
  listings,
  onListingClick,
  center = [-33.8688, 151.2093],
}: MapViewProps) {
  const [selectedListing, setSelectedListing] = useState<SavedListing | null>(null);
  const { theme } = useTheme();

  // Generate pseudo-coordinates for mock listings based on address
  const getCoordinates = (listing: SavedListing, index: number): [number, number] => {
    const baseLat = -33.8688;
    const baseLng = 151.2093;
    const offset = 0.03;
    const angle = (index / listings.length) * Math.PI * 2;
    const radius = offset * (1 + (index % 3) * 0.5);
    return [baseLat + Math.sin(angle) * radius, baseLng + Math.cos(angle) * radius];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-dark-200 dark:border-dark-700"
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="w-full h-full min-h-[500px] z-0"
        style={{ height: "100%", minHeight: "500px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={center} />

        {listings.map((listing, index) => {
          const coords = getCoordinates(listing, index);
          const stats = getCrimeStats(listing.suburb || listing.property_address);
          const safety = stats ? getSafetyLevel(stats.safetyScore) : null;
          return (
            <Marker
              key={listing.id}
              position={coords}
              icon={getSafetyMarkerIcon(listing, theme === "dark")}
              eventHandlers={{
                click: () => setSelectedListing(listing),
              }}
            >
              <Popup maxWidth={280} minWidth={240}>
                <div className="p-1">
                  <img
                    src={listing.image_url + "?w=280&h=160&fit=crop"}
                    alt={listing.property_address}
                    className="w-full h-28 object-cover rounded-lg mb-2"
                    loading="lazy"
                  />
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-lg">
                      {formatCurrency(listing.rent_amount)}/wk
                    </span>
                    <Badge
                      variant={listing.scam_score < 30 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {listing.scam_score < 30 ? (
                        <><Shield className="w-3 h-3 mr-1" /> Safe</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3 mr-1" /> Risky</>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {listing.property_address}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {listing.bedrooms} bed · {listing.bathrooms} bath
                  </p>
                  {safety && (
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: safety.bgColor,
                        color: safety.color,
                      }}
                    >
                      <Shield className="w-3 h-3" />
                      {safety.label} Area
                      {stats && <span className="opacity-70">· Score {stats.safetyScore}</span>}
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onListingClick?.(listing)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg z-[1000]">
        <p className="text-xs font-semibold mb-2 dark:text-dark-100">Area Safety</p>
        <div className="space-y-1">
          {[
            { color: "#10B981", label: "Very Safe (80+)" },
            { color: "#22C55E", label: "Safe (65-79)" },
            { color: "#F59E0B", label: "Moderate (50-64)" },
            { color: "#FB923C", label: "Caution (35-49)" },
            { color: "#EF4444", label: "High Risk (<35)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs dark:text-dark-300">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Listing count */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg z-[1000]">
        <p className="text-xs font-medium dark:text-dark-100">{listings.length} listings</p>
      </div>
    </motion.div>
  );
}

