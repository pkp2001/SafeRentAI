import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  AlertTriangle,
  ExternalLink,
  Loader2,
  CheckCircle,
  Info,
  Globe,
  Lightbulb,
  Search,
  Bed,
  Bath,
  Car,
  MapPin,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { scanListing } from "@/lib/openai";
import { saveScamScan } from "@/lib/supabaseDb";
import { searchProperties, type PropertyListing } from "@/lib/realtyApi";
import type { ScamResult } from "@/types";

interface ScamScannerProps {
  onStartApplication?: (url: string) => void;
  onClose?: () => void;
  initialUrl?: string;
}

// ────────────────────────────────────────────────
// Location extraction from URLs
// ────────────────────────────────────────────────

const AUSTRALIAN_STATES = ["nsw", "vic", "qld", "sa", "wa", "tas", "act", "nt"];

/** Try to pull a suburb and state from a listing URL. */
function extractLocationFromUrl(listingUrl: string): { suburb: string; state: string } | null {
  try {
    const path = new URL(listingUrl).pathname.toLowerCase();
    const parts = path.replace(/[_+]/g, "-").split(/[-/]/).filter(Boolean);

    let state = "";
    let suburb = "";

    // Look for a known state abbreviation
    for (let i = 0; i < parts.length; i++) {
      if (AUSTRALIAN_STATES.includes(parts[i])) {
        state = parts[i].toUpperCase();
        // The suburb is usually immediately before or after the state
        if (i + 1 < parts.length && !AUSTRALIAN_STATES.includes(parts[i + 1]) && !/^\d+$/.test(parts[i + 1])) {
          suburb = parts[i + 1];
        }
        if (!suburb && i - 1 >= 0 && !["property", "house", "apartment", "unit", "rent", "sale", "buy", "for", "web", "listing"].includes(parts[i - 1])) {
          suburb = parts[i - 1];
        }
        break;
      }
    }

    // Fallback: look for suburb-like tokens in the path
    if (!suburb) {
      const ignoreTokens = new Set(["www", "property", "house", "apartment", "unit", "rent", "sale", "buy", "for", "web", "listing", "s", "com", "au", ...AUSTRALIAN_STATES]);
      for (const part of parts) {
        if (!ignoreTokens.has(part) && !/^\d+$/.test(part) && part.length > 2) {
          suburb = part;
          break;
        }
      }
    }

    if (suburb) {
      // Capitalise
      suburb = suburb.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { suburb, state: state || "NSW" };
    }
  } catch { /* invalid URL — fall through */ }
  return null;
}

/** Try to extract a suburb from the AI analysis text. */
function extractLocationFromAnalysis(analysis: string): { suburb: string; state: string } | null {
  // Look for "in <Suburb>" or "<Suburb>, <STATE>"
  const match = analysis.match(/\bin\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,?\s*(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)?/);
  if (match) return { suburb: match[1], state: match[2] || "NSW" };

  const match2 = analysis.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,\s*(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)/);
  if (match2) return { suburb: match2[1], state: match2[2] };

  return null;
}

/** Build search URLs for trusted platforms. */
function trustedPlatformLinks(suburb: string, state: string) {
  const q = encodeURIComponent(`${suburb} ${state}`);
  return [
    { name: "realestate.com.au", url: `https://www.realestate.com.au/rent/in-${suburb.toLowerCase().replace(/\s/g, "+")},+${state.toLowerCase()}/list-1`, color: "text-red-600" },
    { name: "domain.com.au", url: `https://www.domain.com.au/rent/?suburb=${suburb.toLowerCase().replace(/\s/g, "-")}-${state.toLowerCase()}&ptype=apartment,house,unit`, color: "text-purple-600" },
    { name: "flatmates.com.au", url: `https://flatmates.com.au/rooms/${suburb.toLowerCase().replace(/\s/g, "-")}`, color: "text-blue-600" },
    { name: "Google Search", url: `https://www.google.com/search?q=rent+${q}+site:realestate.com.au+OR+site:domain.com.au`, color: "text-slate-600" },
  ];
}

const loadingMessages = [
  "Fetching listing page…",
  "Extracting listing content…",
  "Analysing platform credibility…",
  "Checking price patterns…",
  "Scanning for red flags…",
  "Evaluating contact details…",
  "Reviewing listing quality…",
  "Generating risk report…",
  "Almost there — finishing analysis…",
  "Running deep verification…",
];

const severityColors = {
  low: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  },
  high: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
  },
};

type AltState = "idle" | "loading" | "loaded" | "none";

export function ScamScanner({ onStartApplication, onClose, initialUrl = "" }: ScamScannerProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState(initialUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safe alternatives state
  const [altState, setAltState] = useState<AltState>("idle");
  const [altListings, setAltListings] = useState<PropertyListing[]>([]);
  const [altLocation, setAltLocation] = useState<{ suburb: string; state: string } | null>(null);

  /** Search safer alternatives for the same location. */
  const handleViewAlternatives = async () => {
    setAltState("loading");

    // 1. Extract location from URL
    let loc = extractLocationFromUrl(url);

    // 2. Fallback: try AI analysis text
    if (!loc && result?.analysis) {
      loc = extractLocationFromAnalysis(result.analysis);
    }

    if (!loc) {
      // Can't determine location — show "no alternatives"
      setAltLocation(null);
      setAltListings([]);
      setAltState("none");
      return;
    }

    setAltLocation(loc);

    try {
      const listings = await searchProperties({
        suburb: loc.suburb,
        state: loc.state,
        listingType: "rent",
        pageSize: 6,
      });

      if (listings.length > 0) {
        setAltListings(listings);
        setAltState("loaded");
      } else {
        setAltListings([]);
        setAltState("none");
      }
    } catch (err) {
      console.error("Alternatives search failed:", err);
      setAltListings([]);
      setAltState("none");
    }
  };

  const handleScan = async () => {
    if (!url.trim()) return;
    setIsScanning(true);
    setProgress(0);
    setLoadingMsg(0);
    setError(null);
    setAltState("idle");
    setAltListings([]);
    setAltLocation(null);

    // Animate progress — slow enough to not stall visibly during retries (~60s max)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(progressInterval);
          return 92;
        }
        // Slow down as we get further to leave room for retries
        const increment = prev < 50 ? Math.random() * 5 : Math.random() * 2;
        return Math.min(prev + increment, 92);
      });
    }, 800);

    const msgInterval = setInterval(() => {
      setLoadingMsg((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    try {
      const scanResult = await scanListing(url);
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setProgress(100);

      // Save scan to Supabase (non-blocking)
      saveScamScan({
        listing_url: url,
        scam_score: scanResult.scamScore,
        is_safe: scanResult.isSafe,
        flags: scanResult.flags,
        analysis: scanResult.analysis,
      }).catch(() => {
        /* silently ignore if not authed */
      });

      setTimeout(() => {
        setResult(scanResult);
        setShowResult(true);
        setIsScanning(false);

        if (scanResult.isSafe) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#10B981", "#3B82F6", "#60A5FA"],
          });
        }
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setIsScanning(false);
      setError(
        err instanceof Error
          ? err.message
          : "Scan failed. Please check the URL and try again."
      );
    }
  };

  return (
    <>
      {/* Scanner Input */}
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-0">
        {/* Stacked layout on mobile, inline on sm+ */}
        <div className="flex flex-col sm:flex-row sm:relative gap-2 sm:gap-0">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste any rental listing URL…"
            className="w-full px-4 sm:px-6 py-4 sm:py-6 text-base sm:text-lg rounded-2xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-dark-200 dark:border-dark-700 shadow-xl shadow-primary-500/10 dark:shadow-primary-900/20 sm:pr-32 h-auto"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button
            onClick={handleScan}
            disabled={isScanning || !url.trim()}
            className="sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 rounded-xl px-6 py-3 h-auto w-full sm:w-auto"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Scan
              </>
            )}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Loading State */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Shield className="w-6 h-6 text-primary-500" />
                </motion.div>
                <div>
                  <span className="text-sm font-medium text-dark-600 dark:text-dark-300">
                    {loadingMessages[loadingMsg]}
                  </span>
                  <p className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                    Fetching real listing data and running AI analysis
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-2">
                {Math.round(progress)}% complete
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example URLs */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-dark-400 dark:text-dark-500">Try:</span>
          {[
            "realestate.com.au/property-house-nsw-sydney-123456",
            "domain.com.au/rent/sydney-nsw-2000",
            "gumtree.com.au/s-property-for-rent/sydney",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setUrl(`https://www.${example}`)}
              className="text-xs text-primary-500 hover:text-primary-600 hover:underline transition-colors cursor-pointer"
            >
              {example.split("/")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm overflow-y-auto"
          >
            {/* Scroll container — top-aligned on mobile, centred on desktop */}
            <div className="min-h-full flex items-start sm:items-center justify-center px-3 py-4 sm:p-6">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="w-full max-w-2xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 overflow-hidden"
              >
                {/* Header */}
                <div
                  className={`px-4 py-6 sm:p-8 text-center relative ${
                    result.isSafe
                      ? "bg-gradient-to-br from-success-50 to-white dark:from-success-900/20 dark:to-dark-800"
                      : "bg-gradient-to-br from-danger-50 to-white dark:from-danger-900/20 dark:to-dark-800"
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowResult(false);
                      onClose?.();
                    }}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                    aria-label="Close scan results"
                  >
                    <X className="w-5 h-5 text-dark-400 dark:text-dark-500" />
                  </button>

                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2, damping: 10 }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center ${
                      result.isSafe
                        ? "bg-gradient-to-br from-success-500 to-success-600"
                        : "bg-gradient-to-br from-danger-500 to-danger-600"
                    }`}
                  >
                    {result.isSafe ? (
                      <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    ) : (
                      <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    )}
                  </motion.div>

                  <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 dark:text-dark-100">
                    {result.isSafe
                      ? "This Listing Appears Safe ✓"
                      : "⚠️ Potential Scam Detected"}
                  </h2>
                  <p className="text-dark-500 dark:text-dark-400 text-xs sm:text-sm">
                    {result.source === "live-scrape"
                      ? "Analysed from live page content"
                      : result.source === "ai-url-analysis"
                        ? "Analysed from URL (page content unavailable)"
                        : "Limited analysis — API key not configured"}
                  </p>
                </div>

                {/* Score */}
                <div className="px-4 sm:px-8 py-3 sm:py-4">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-sm font-medium text-dark-600 dark:text-dark-300">
                      Scam Risk Score
                    </span>
                    <Badge
                      variant={result.isSafe ? "safe" : "risky"}
                      className="text-sm px-3 sm:px-4 py-1"
                    >
                      {result.scamScore}/100
                    </Badge>
                  </div>
                  <Progress
                    value={result.scamScore}
                    className={`h-2.5 sm:h-3 ${
                      result.isSafe
                        ? "[&>div]:bg-success-500"
                        : "[&>div]:bg-danger-500"
                    }`}
                  />
                </div>

                {/* AI Analysis Summary */}
                {result.analysis && (
                  <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold mb-1 dark:text-dark-200">
                          AI Analysis
                        </h3>
                        <p className="text-xs sm:text-sm text-dark-600 dark:text-dark-300 leading-relaxed break-words">
                          {result.analysis}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Categories */}
                {result.riskCategories && result.riskCategories.length > 0 && (
                  <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-dark-100 dark:border-dark-700">
                    <h3 className="text-sm font-semibold mb-2 sm:mb-3 dark:text-dark-200">
                      Risk Breakdown
                    </h3>
                    <div className="space-y-2">
                      {result.riskCategories.map((cat, i) => {
                        const colors = severityColors[cat.severity];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                            className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                          >
                            <div className="mt-0.5 shrink-0">{colors.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                                <span className={`text-xs font-semibold ${colors.text}`}>
                                  {cat.category}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                                >
                                  {cat.severity}
                                </span>
                              </div>
                              <p className="text-xs text-dark-600 dark:text-dark-300 leading-relaxed break-words">
                                {cat.detail}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {result.flags.length > 0 && (
                  <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-dark-100 dark:border-dark-700">
                    <h3 className="text-sm font-semibold mb-2 sm:mb-3 dark:text-dark-200">
                      {result.isSafe ? "Minor Notes" : "Red Flags Found"}
                    </h3>
                    <div className="space-y-2">
                      {result.flags.map((flag, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2 text-xs sm:text-sm"
                        >
                          <AlertTriangle
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              result.isSafe ? "text-warning-500" : "text-danger-500"
                            }`}
                          />
                          <span className="text-dark-600 dark:text-dark-300 break-words">
                            {flag}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Lightbulb className="w-4 h-4 text-primary-500" />
                      <h3 className="text-sm font-semibold dark:text-dark-200">
                        Recommendations
                      </h3>
                    </div>
                    <ul className="space-y-1.5">
                      {result.recommendations.map((rec, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          className="flex items-start gap-2 text-xs sm:text-sm text-dark-600 dark:text-dark-300"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                          <span className="break-words">{rec}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Data Source Badge */}
                {result.source && (
                  <div className="px-4 sm:px-8 py-2.5 sm:py-3 border-t border-dark-100 dark:border-dark-700 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-dark-400 dark:text-dark-500">
                    <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>
                      {result.source === "live-scrape"
                        ? "Real-time analysis from live listing content"
                        : result.source === "ai-url-analysis"
                          ? "AI analysis based on URL and platform patterns"
                          : "API key required for full analysis"}
                    </span>
                    <span className="ml-auto">
                      {result.analysisDate.toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* ── Safe Alternatives Section (scam only) ── */}
                {!result.isSafe && altState !== "idle" && (
                  <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-dark-100 dark:border-dark-700">
                    {/* Loading */}
                    {altState === "loading" && (
                      <div className="flex items-center justify-center gap-3 py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                        <span className="text-sm text-dark-500 dark:text-dark-400">
                          Searching for safer alternatives…
                        </span>
                      </div>
                    )}

                    {/* Listings found */}
                    {altState === "loaded" && altListings.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h3 className="text-sm font-semibold mb-1 dark:text-dark-200 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          Safer Alternatives
                          {altLocation && (
                            <span className="font-normal text-dark-400 dark:text-dark-500">
                              in {altLocation.suburb}, {altLocation.state}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-dark-400 dark:text-dark-500 mb-3">
                          Found {altListings.length} verified rental{altListings.length !== 1 ? "s" : ""} on trusted platforms
                        </p>

                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                          {altListings.map((listing) => (
                            <motion.div
                              key={listing.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3 p-2.5 sm:p-3 rounded-xl border border-dark-100 dark:border-dark-700 bg-white dark:bg-dark-800 hover:shadow-md transition-shadow cursor-pointer group"
                              onClick={() => {
                                setShowResult(false);
                                onClose?.();
                                navigate(`/listing/${listing.id}`, { state: { listing } });
                              }}
                            >
                              {/* Thumbnail */}
                              <div className="w-20 h-20 sm:w-24 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-dark-100 dark:bg-dark-700">
                                <img
                                  src={listing.images?.[0] || ""}
                                  alt={listing.address.suburb}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://via.placeholder.com/200x150?text=No+Image";
                                  }}
                                />
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-dark-800 dark:text-dark-100 truncate">
                                  {listing.price.display || `$${listing.price.value}/wk`}
                                </p>
                                <p className="text-xs text-dark-500 dark:text-dark-400 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {listing.address.suburb}, {listing.address.state}
                                </p>
                                <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-dark-400 dark:text-dark-500">
                                  {listing.features.bedrooms > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Bed className="w-3 h-3" /> {listing.features.bedrooms}
                                    </span>
                                  )}
                                  {listing.features.bathrooms > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Bath className="w-3 h-3" /> {listing.features.bathrooms}
                                    </span>
                                  )}
                                  {listing.features.parking > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Car className="w-3 h-3" /> {listing.features.parking}
                                    </span>
                                  )}
                                  <span className="text-emerald-500 font-medium ml-auto flex items-center gap-0.5">
                                    <ShieldCheck className="w-3 h-3" /> Verified
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-dark-300 dark:text-dark-600 self-center shrink-0 group-hover:text-primary-500 transition-colors" />
                            </motion.div>
                          ))}
                        </div>

                        {/* Trusted platform links */}
                        {altLocation && (
                          <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700">
                            <p className="text-[11px] text-dark-400 dark:text-dark-500 mb-2">
                              Also search on trusted platforms:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {trustedPlatformLinks(altLocation.suburb, altLocation.state).map((link) => (
                                <a
                                  key={link.name}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-[11px] font-medium ${link.color} hover:underline flex items-center gap-1`}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {link.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Search more in SafeRentAI */}
                        <Button
                          variant="outline"
                          className="w-full mt-3"
                          onClick={() => {
                            setShowResult(false);
                            onClose?.();
                            navigate("/search", {
                              state: { suburb: altLocation?.suburb, state: altLocation?.state },
                            });
                          }}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search More in SafeRent AI
                        </Button>
                      </motion.div>
                    )}

                    {/* No alternatives found */}
                    {altState === "none" && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-5"
                      >
                        <div className="w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-700 mx-auto mb-3 flex items-center justify-center">
                          <Search className="w-6 h-6 text-dark-400 dark:text-dark-500" />
                        </div>
                        <p className="text-sm font-medium text-dark-600 dark:text-dark-300 mb-1">
                          No alternatives available
                          {altLocation && ` in ${altLocation.suburb}`}
                        </p>
                        <p className="text-xs text-dark-400 dark:text-dark-500 mb-4">
                          We couldn't find verified listings for this area right now.
                        </p>

                        {/* Trusted platform links as fallback */}
                        {altLocation && (
                          <div className="mb-4">
                            <p className="text-[11px] text-dark-400 dark:text-dark-500 mb-2">
                              Try searching directly on trusted platforms:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {trustedPlatformLinks(altLocation.suburb, altLocation.state).map((link) => (
                                <a
                                  key={link.name}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs font-medium ${link.color} hover:underline flex items-center gap-1`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {link.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full"
                          onClick={() => {
                            setShowResult(false);
                            onClose?.();
                            navigate("/search", {
                              state: { suburb: altLocation?.suburb, state: altLocation?.state },
                            });
                          }}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search More
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 sm:p-6 border-t border-dark-100 dark:border-dark-700 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  {result.isSafe ? (
                    <>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setShowResult(false);
                          onClose?.();
                          onStartApplication?.(url);
                        }}
                      >
                        Start Application
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Listing
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="destructive" className="flex-1">
                        Report Scam
                      </Button>
                      {altState === "idle" ? (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleViewAlternatives}
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          View Safe Alternatives
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowResult(false);
                            onClose?.();
                          }}
                        >
                          Close
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
