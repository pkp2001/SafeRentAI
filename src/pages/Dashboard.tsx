import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText, Shield, Heart, Clock, Search, TrendingUp,
  ArrowRight, Plus, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationTracker } from "@/components/features/ApplicationTracker";
import { ListingCard } from "@/components/features/ListingCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApplications, useDeleteApplication } from "@/hooks/useApplications";
import { useSavedListings } from "@/hooks/useListings";
import { getActivityLog, getScamScanCount, type ActivityLogEntry } from "@/lib/supabaseDb";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const activityIcons: Record<string, { icon: typeof Shield; color: string }> = {
  scan: { icon: Shield, color: "text-primary-500" },
  save: { icon: Heart, color: "text-danger-500" },
  apply: { icon: FileText, color: "text-success-500" },
  view: { icon: Search, color: "text-warning-500" },
  profile_update: { icon: TrendingUp, color: "text-warning-500" },
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch real data from Supabase
  const {
    applications,
    isLoading: appsLoading,
    stats: appStats,
  } = useApplications();

  const deleteApp = useDeleteApplication();

  const {
    data: savedListings,
    isLoading: listingsLoading,
  } = useSavedListings();

  const { data: activityLog, isLoading: activityLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ["activity"],
    queryFn: () => getActivityLog(10),
    staleTime: 2 * 60 * 1000,
  });

  const { data: scamScanCount } = useQuery<number>({
    queryKey: ["scam-scan-count"],
    queryFn: getScamScanCount,
  });

  const safeListings = (savedListings || []).filter((l) => l.scam_score < 30);
  const displayedListings = safeListings.slice(0, 4);

  const stats = [
    {
      label: "Total Applications",
      value: appStats.total,
      icon: FileText,
      color: "text-primary-600",
      bg: "bg-primary-50",
      change: appStats.pending > 0 ? `${appStats.pending} pending` : "None pending",
    },
    {
      label: "Pending Reviews",
      value: appStats.pending,
      icon: Clock,
      color: "text-warning-600",
      bg: "bg-warning-50",
      change: appStats.shortlisted > 0 ? `${appStats.shortlisted} shortlisted` : "Awaiting",
    },
    {
      label: "Scams Avoided",
      value: scamScanCount ?? 0,
      icon: Shield,
      color: "text-success-600",
      bg: "bg-success-50",
      change: "Protected",
    },
    {
      label: "Saved Listings",
      value: (savedListings || []).length,
      icon: Heart,
      color: "text-danger-600",
      bg: "bg-danger-50",
      change: safeListings.length > 0 ? `${safeListings.length} safe` : "None saved",
    },
  ];

  const isLoading = appsLoading || listingsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div {...fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-dark-100">Dashboard</h1>
        <p className="text-dark-500 dark:text-dark-300">Welcome back! Here's your rental journey overview.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-dark-800 rounded-xl p-5 border border-dark-100 dark:border-dark-700 shadow-sm hover:shadow-md dark:hover:shadow-primary-900/20 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} dark:bg-opacity-20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-xs text-dark-400 dark:text-dark-500">{stat.change}</span>
            </div>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-dark-300" />
            ) : (
              <>
                <p className="text-2xl font-bold dark:text-dark-100">{stat.value}</p>
                <p className="text-sm text-dark-500 dark:text-dark-300">{stat.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Applications - Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Application Tracker */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold dark:text-dark-100">My Applications</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/search")}>
                <Plus className="w-4 h-4 mr-1" />
                New Application
              </Button>
            </div>
            {appsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : applications.length > 0 ? (
              <ApplicationTracker
                applications={applications}
                onDelete={(id) =>
                  deleteApp.mutate(id, {
                    onSuccess: () => toast.success("Application deleted"),
                    onError: (err) =>
                      toast.error(
                        `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`
                      ),
                  })
                }
              />
            ) : (
              <EmptyState
                title="No applications yet"
                description="Start by searching for listings and submitting your first application"
                actionLabel="Search Listings"
                onAction={() => navigate("/search")}
              />
            )}
          </motion.div>

          {/* Saved Listings */}
          <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold dark:text-dark-100">Saved Listings</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/search")}>
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {listingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : displayedListings.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {displayedListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} compact />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved listings"
                description="Save listings you're interested in to track them here"
                actionLabel="Browse Listings"
                onAction={() => navigate("/search")}
              />
            )}
          </motion.div>
        </div>

        {/* Right Column - Activity Feed */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
          <h2 className="text-xl font-semibold mb-4 dark:text-dark-100">Recent Activity</h2>
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-100 dark:border-dark-700 shadow-sm divide-y divide-dark-100 dark:divide-dark-700">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
            ) : (activityLog || []).length > 0 ? (
              (activityLog || []).map((activity) => {
                const config = activityIcons[activity.activity_type] || {
                  icon: AlertCircle,
                  color: "text-dark-400",
                };
                const ActivityIcon = config.icon;

                return (
                  <div key={activity.id} className="flex items-start gap-3 p-4">
                    <div className="w-8 h-8 rounded-lg bg-dark-50 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                      <ActivityIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-dark-200">{activity.description || activity.activity_type}</p>
                      <p className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                        {timeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-dark-400 dark:text-dark-500">
                  No activity yet. Start scanning listings!
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-dark-500 dark:text-dark-300">Quick Actions</h3>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/search")}
            >
              <Search className="w-4 h-4 mr-2" />
              Search Listings
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/resources")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Scam Detection Tips
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
