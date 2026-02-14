import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon, SlidersHorizontal, Grid3X3, Map, X,
  ChevronDown, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingCard } from "@/components/features/ListingCard";
import { MapView } from "@/components/features/MapView";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { mockListings, sydneySuburbs } from "@/lib/mockData";
import type { SavedListing } from "@/types";

type ViewMode = "grid" | "map";

export default function Search() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [bedrooms, setBedrooms] = useState<string>("any");
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [scamFreeOnly, setScamFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(false);

  const filteredListings = useMemo(() => {
    let results = [...mockListings];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (l) =>
          l.property_address.toLowerCase().includes(q) ||
          l.listing_url.toLowerCase().includes(q)
      );
    }

    results = results.filter(
      (l) => l.rent_amount >= priceRange[0] && l.rent_amount <= priceRange[1]
    );

    if (bedrooms !== "any") {
      const beds = bedrooms === "4+" ? 4 : parseInt(bedrooms);
      results = results.filter((l) =>
        bedrooms === "4+" ? l.bedrooms >= beds : l.bedrooms === beds
      );
    }

    if (scamFreeOnly) {
      results = results.filter((l) => l.scam_score < 30);
    }

    switch (sortBy) {
      case "price-low":
        results.sort((a, b) => a.rent_amount - b.rent_amount);
        break;
      case "price-high":
        results.sort((a, b) => b.rent_amount - a.rent_amount);
        break;
      case "safest":
        results.sort((a, b) => a.scam_score - b.scam_score);
        break;
      default:
        break;
    }

    return results;
  }, [searchQuery, priceRange, bedrooms, scamFreeOnly, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setPriceRange([0, 1000]);
    setBedrooms("any");
    setPropertyTypes([]);
    setScamFreeOnly(false);
    setSortBy("newest");
  };

  const activeFilterCount = [
    searchQuery,
    priceRange[0] > 0 || priceRange[1] < 1000,
    bedrooms !== "any",
    propertyTypes.length > 0,
    scamFreeOnly,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-dark-50/30">
      {/* Search Header */}
      <div className="bg-white border-b border-dark-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by suburb, address..."
                className="pl-10 py-5 text-base rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative rounded-xl"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <div className="hidden sm:flex items-center bg-dark-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-white shadow-sm" : "text-dark-400 hover:text-dark-600"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "map" ? "bg-white shadow-sm" : "text-dark-400 hover:text-dark-600"
                }`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-dark-500">Price Range ($/week)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
                        placeholder="Min"
                        className="text-sm"
                      />
                      <span className="text-dark-400">–</span>
                      <Input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
                        placeholder="Max"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-dark-500">Bedrooms</Label>
                    <div className="flex gap-1">
                      {["any", "1", "2", "3", "4+"].map((b) => (
                        <button
                          key={b}
                          onClick={() => setBedrooms(b)}
                          className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                            bedrooms === b
                              ? "bg-primary-500 text-white border-primary-500"
                              : "border-dark-200 hover:border-primary-300"
                          }`}
                        >
                          {b === "any" ? "Any" : b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-dark-500">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="safest">Safest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-dark-500">Options</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={scamFreeOnly}
                        onCheckedChange={(c) => setScamFreeOnly(c === true)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => setScamFreeOnly(!scamFreeOnly)}>
                        Scam-free only
                      </label>
                    </div>
                    <button
                      onClick={resetFilters}
                      className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset all
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-dark-500">
            <span className="font-semibold text-dark-900">{filteredListings.length}</span> listings found
          </p>
          <button
            className="sm:hidden flex items-center gap-1 text-sm text-dark-500"
            onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
          >
            {viewMode === "grid" ? <Map className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            {viewMode === "grid" ? "Map" : "Grid"} view
          </button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters or search for a different area"
            actionLabel="Clear Filters"
            onAction={resetFilters}
          />
        ) : viewMode === "grid" ? (
          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredListings.map((listing, index) => (
              <motion.div
                key={listing.id}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                }}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="h-[600px]">
            <MapView listings={filteredListings} />
          </div>
        )}
      </div>
    </div>
  );
}

