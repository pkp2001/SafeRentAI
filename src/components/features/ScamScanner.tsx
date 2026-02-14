import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, X, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { scanListing } from "@/lib/openai";
import type { ScamResult } from "@/types";

interface ScamScannerProps {
  onStartApplication?: (url: string) => void;
  onClose?: () => void;
  initialUrl?: string;
}

const loadingMessages = [
  "Analyzing listing...",
  "Checking images...",
  "Verifying landlord details...",
  "Detecting red flags...",
  "Generating report...",
];

export function ScamScanner({ onStartApplication, onClose, initialUrl = "" }: ScamScannerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleScan = async () => {
    if (!url.trim()) return;
    setIsScanning(true);
    setProgress(0);
    setLoadingMsg(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    const msgInterval = setInterval(() => {
      setLoadingMsg((prev) => (prev + 1) % loadingMessages.length);
    }, 600);

    try {
      const scanResult = await scanListing(url);
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setProgress(100);

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
    } catch {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setIsScanning(false);
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
            placeholder="Paste rental listing URL or search Sydney..."
            className="w-full px-6 py-6 text-lg rounded-2xl bg-white/80 backdrop-blur-sm border border-dark-200 shadow-xl shadow-primary-500/10 pr-32 h-auto"
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

        {/* Loading State */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-6 rounded-2xl bg-white border border-dark-200 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Shield className="w-6 h-6 text-primary-500" />
                </motion.div>
                <span className="text-sm font-medium text-dark-600">
                  {loadingMessages[loadingMsg]}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-dark-400 mt-2">{Math.round(progress)}% complete</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example URLs */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-dark-400">Try:</span>
          {["domain.com.au/example", "gumtree.com.au/listing", "realestate.com.au/property"].map(
            (example) => (
              <button
                key={example}
                onClick={() => setUrl(`https://${example}`)}
                className="text-xs text-primary-500 hover:text-primary-600 hover:underline transition-colors cursor-pointer"
              >
                {example}
              </button>
            )
          )}
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-dark-200 overflow-hidden"
            >
              {/* Header */}
              <div
                className={`p-8 text-center ${
                  result.isSafe
                    ? "bg-gradient-to-br from-success-50 to-white"
                    : "bg-gradient-to-br from-danger-50 to-white"
                }`}
              >
                <button
                  onClick={() => {
                    setShowResult(false);
                    onClose?.();
                  }}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-100 transition-colors"
                  aria-label="Close scan results"
                >
                  <X className="w-5 h-5 text-dark-400" />
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

                <h2 className="text-2xl font-bold mb-2">
                  {result.isSafe
                    ? "This Listing Appears Safe ✓"
                    : "⚠️ Potential Scam Detected"}
                </h2>
                <p className="text-dark-500">
                  {result.isSafe
                    ? "No major scam indicators detected"
                    : `${result.flags.length} red flag${result.flags.length > 1 ? "s" : ""} found`}
                </p>
              </div>

              {/* Score */}
              <div className="px-8 py-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-dark-600">Scam Risk Score</span>
                  <Badge variant={result.isSafe ? "safe" : "risky"} className="text-sm px-4 py-1">
                    {result.scamScore}/100
                  </Badge>
                </div>
                <Progress
                  value={result.scamScore}
                  className={`h-3 ${result.isSafe ? "[&>div]:bg-success-500" : "[&>div]:bg-danger-500"}`}
                />
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div className="px-8 py-4 border-t border-dark-100">
                  <h3 className="text-sm font-semibold mb-3">
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
                        <span className="text-dark-600">{flag}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 border-t border-dark-100 flex gap-3">
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
                    <Button variant="outline" className="flex-1">
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

