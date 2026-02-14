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
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { scanListing } from "@/lib/openai";
import { saveScamScan } from "@/lib/supabaseDb";
import type { ScamResult } from "@/types";

interface ScamScannerProps {
  onStartApplication?: (url: string) => void;
  onClose?: () => void;
  initialUrl?: string;
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

export function ScamScanner({ onStartApplication, onClose, initialUrl = "" }: ScamScannerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    setIsScanning(true);
    setProgress(0);
    setLoadingMsg(0);
    setError(null);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 8;
      });
    }, 400);

    const msgInterval = setInterval(() => {
      setLoadingMsg((prev) => (prev + 1) % loadingMessages.length);
    }, 1200);

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
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste any rental listing URL (e.g. realestate.com.au, domain.com.au, gumtree…)"
            className="w-full px-6 py-6 text-lg rounded-2xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-dark-200 dark:border-dark-700 shadow-xl shadow-primary-500/10 dark:shadow-primary-900/20 pr-32 h-auto"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button
            onClick={handleScan}
            disabled={isScanning || !url.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-6 py-3 h-auto"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-2xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 overflow-hidden my-8"
            >
              {/* Header */}
              <div
                className={`p-8 text-center relative ${
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
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                  aria-label="Close scan results"
                >
                  <X className="w-5 h-5 text-dark-400 dark:text-dark-500" />
                </button>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, damping: 10 }}
                  className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    result.isSafe
                      ? "bg-gradient-to-br from-success-500 to-success-600"
                      : "bg-gradient-to-br from-danger-500 to-danger-600"
                  }`}
                >
                  {result.isSafe ? (
                    <ShieldCheck className="w-10 h-10 text-white" />
                  ) : (
                    <ShieldAlert className="w-10 h-10 text-white" />
                  )}
                </motion.div>

                <h2 className="text-2xl font-bold mb-2 dark:text-dark-100">
                  {result.isSafe
                    ? "This Listing Appears Safe ✓"
                    : "⚠️ Potential Scam Detected"}
                </h2>
                <p className="text-dark-500 dark:text-dark-400 text-sm">
                  {result.source === "live-scrape"
                    ? "Analysed from live page content"
                    : result.source === "ai-url-analysis"
                      ? "Analysed from URL (page content unavailable)"
                      : "Limited analysis — API key not configured"}
                </p>
              </div>

              {/* Score */}
              <div className="px-8 py-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-dark-600 dark:text-dark-300">
                    Scam Risk Score
                  </span>
                  <Badge
                    variant={result.isSafe ? "safe" : "risky"}
                    className="text-sm px-4 py-1"
                  >
                    {result.scamScore}/100
                  </Badge>
                </div>
                <Progress
                  value={result.scamScore}
                  className={`h-3 ${
                    result.isSafe
                      ? "[&>div]:bg-success-500"
                      : "[&>div]:bg-danger-500"
                  }`}
                />
              </div>

              {/* AI Analysis Summary */}
              {result.analysis && (
                <div className="px-8 py-4 border-t border-dark-100 dark:border-dark-700">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold mb-1 dark:text-dark-200">
                        AI Analysis
                      </h3>
                      <p className="text-sm text-dark-600 dark:text-dark-300 leading-relaxed">
                        {result.analysis}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Categories */}
              {result.riskCategories && result.riskCategories.length > 0 && (
                <div className="px-8 py-4 border-t border-dark-100 dark:border-dark-700">
                  <h3 className="text-sm font-semibold mb-3 dark:text-dark-200">
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
                          className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                        >
                          <div className="mt-0.5 shrink-0">{colors.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-semibold ${colors.text}`}>
                                {cat.category}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                              >
                                {cat.severity}
                              </span>
                            </div>
                            <p className="text-xs text-dark-600 dark:text-dark-300 leading-relaxed">
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
                <div className="px-8 py-4 border-t border-dark-100 dark:border-dark-700">
                  <h3 className="text-sm font-semibold mb-3 dark:text-dark-200">
                    {result.isSafe ? "Minor Notes" : "Red Flags Found"}
                  </h3>
                  <div className="space-y-2">
                    {result.flags.map((flag, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-start gap-2 text-sm"
                      >
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            result.isSafe ? "text-warning-500" : "text-danger-500"
                          }`}
                        />
                        <span className="text-dark-600 dark:text-dark-300">
                          {flag}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="px-8 py-4 border-t border-dark-100 dark:border-dark-700">
                  <div className="flex items-center gap-2 mb-3">
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
                        className="flex items-start gap-2 text-sm text-dark-600 dark:text-dark-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Source Badge */}
              {result.source && (
                <div className="px-8 py-3 border-t border-dark-100 dark:border-dark-700 flex items-center gap-2 text-xs text-dark-400 dark:text-dark-500">
                  <Globe className="w-3.5 h-3.5" />
                  {result.source === "live-scrape"
                    ? "Real-time analysis from live listing content"
                    : result.source === "ai-url-analysis"
                      ? "AI analysis based on URL and platform patterns"
                      : "API key required for full analysis"}
                  <span className="ml-auto">
                    {result.analysisDate.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 border-t border-dark-100 dark:border-dark-700 flex gap-3">
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
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowResult(false);
                        onClose?.();
                      }}
                    >
                      View Safe Alternatives
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
