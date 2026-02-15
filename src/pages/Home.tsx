import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Zap, Calculator, Search, ArrowRight, CheckCircle,
  ChevronRight, Star, Users, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScamScanner } from "@/components/features/ScamScanner";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: Shield,
    title: "Detect Scams",
    description: "AI-powered analysis identifies red flags in rental listings before you apply.",
    color: "from-primary-500 to-primary-600",
    bgColor: "bg-primary-50",
    iconColor: "text-primary-600",
  },
  {
    icon: Zap,
    title: "Auto-Apply",
    description: "Fill your profile once and apply to multiple properties with one click.",
    color: "from-warning-500 to-warning-600",
    bgColor: "bg-warning-50",
    iconColor: "text-warning-600",
  },
  {
    icon: Calculator,
    title: "Affordability Check",
    description: "Calculate if a property fits your budget, tailored for Centrelink recipients.",
    color: "from-success-500 to-success-600",
    bgColor: "bg-success-50",
    iconColor: "text-success-600",
  },
];

const steps = [
  { num: 1, title: "Paste listing URL", desc: "Copy any rental listing URL from Domain, REA, or Gumtree" },
  { num: 2, title: "AI scans for scams", desc: "Our AI analyzes the listing for red flags and suspicious patterns" },
  { num: 3, title: "Fill profile once", desc: "Enter your details once and reuse them for every application" },
  { num: 4, title: "Apply instantly", desc: "Submit applications with AI-generated cover letters in seconds" },
];

const stats = [
  { icon: Shield, value: "10,247", label: "Scams Prevented" },
  { icon: Users, value: "3,892", label: "Applications Submitted" },
  { icon: Lock, value: "100%", label: "Free to Use" },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchUrl, setSearchUrl] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = () => {
    if (searchUrl.trim()) {
      setShowScanner(true);
    } else {
      navigate("/search");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-white via-primary-50/30 to-white dark:from-dark-900 dark:via-dark-800/30 dark:to-dark-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100/40 dark:bg-primary-900/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success-100/30 dark:bg-success-900/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center py-20">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Trusted by 10,000+ Australians
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 dark:text-dark-100"
          >
            Find{" "}
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              Safe
            </span>{" "}
            Rental Housing
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-dark-500 dark:text-dark-300 max-w-2xl mx-auto mb-12"
          >
            AI-powered scam detection and automated applications for vulnerable Australians.
            Never fall for a rental scam again.
          </motion.p>

          {/* Search Input */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative max-w-2xl mx-auto mb-10"
          >
            <div className="relative flex items-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xl shadow-primary-500/10 p-2">
              <Search className="w-5 h-5 text-dark-400 ml-4 flex-shrink-0" />
              <Input
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                placeholder="Paste rental listing URL or search Sydney..."
                className="border-0 bg-transparent text-lg px-4 py-5 focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
              />
              <Button
                size="lg"
                onClick={handleScan}
                className="rounded-xl px-8 py-3 flex-shrink-0"
              >
                Scan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-8"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-dark-500 dark:text-dark-300">
                <stat.icon className="w-4 h-4 text-success-500" />
                <span className="font-semibold">{stat.value}</span>
                <span className="text-sm">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-dark-100">
              Everything you need to rent safely
            </h2>
            <p className="text-lg text-dark-500 dark:text-dark-300 max-w-2xl mx-auto">
              SafeRent AI protects you at every step of your rental journey
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-dark-800 rounded-2xl p-8 border border-dark-100 dark:border-dark-700 shadow-sm hover:shadow-xl dark:hover:shadow-primary-900/20 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl ${feature.bgColor} dark:bg-opacity-20 flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3 dark:text-dark-100">{feature.title}</h3>
                <p className="text-dark-500 dark:text-dark-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-dark-50/50 dark:bg-dark-800/50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-dark-100">How it works</h2>
            <p className="text-lg text-dark-500 dark:text-dark-300">Four simple steps to safe renting</p>
          </motion.div>

          <div className="space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="flex gap-6 relative"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 z-10 shadow-md">
                    {step.num}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-full bg-primary-200 dark:bg-primary-800 min-h-[60px]" />
                  )}
                </div>
                <div className="pb-10">
                  <h3 className="text-lg font-semibold mb-1 dark:text-dark-100">{step.title}</h3>
                  <p className="text-dark-500 dark:text-dark-300">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-12 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start renting safely today
            </h2>
            <p className="text-lg text-primary-100 mb-8 max-w-xl mx-auto">
              Join thousands of Australians who trust SafeRent AI to protect them from rental scams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/signup")}
                className="bg-white text-primary-600 hover:bg-primary-50 px-8"
              >
                Get Started Free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/search")}
                className="bg-white/20 text-white border-2 border-white/50 hover:bg-white hover:text-primary-600 px-8 backdrop-blur-sm"
              >
                Browse Listings
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Scam Scanner Overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm flex flex-col items-center justify-start pt-20 px-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold dark:text-dark-100">Scan Listing for Scams</h2>
              <button
                onClick={() => setShowScanner(false)}
                className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5 text-dark-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ScamScanner
              initialUrl={searchUrl}
              onClose={() => setShowScanner(false)}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

