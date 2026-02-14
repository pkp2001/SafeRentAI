import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, Star, CheckCircle, XCircle, MoreVertical, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, timeAgo } from "@/lib/utils";
import type { Application } from "@/types";

interface ApplicationTrackerProps {
  applications: Application[];
  onDelete?: (id: string) => void;
}

const statusConfig = {
  pending: { label: "Pending", variant: "default" as const, icon: Clock, color: "text-primary-500" },
  shortlisted: { label: "Shortlisted", variant: "warning" as const, icon: Star, color: "text-warning-500" },
  successful: { label: "Successful", variant: "success" as const, icon: CheckCircle, color: "text-success-500" },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-danger-500" },
};

const statusSteps = ["Submitted", "Under Review", "Shortlisted", "Final Decision"];

export function ApplicationTracker({ applications, onDelete }: ApplicationTrackerProps) {
  const [filter, setFilter] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((app) => app.status === filter);

  const getStepIndex = (status: Application["status"]) => {
    switch (status) {
      case "pending": return 0;
      case "shortlisted": return 2;
      case "successful": return 3;
      case "rejected": return 3;
      default: return 0;
    }
  };

  if (applications.length === 0) {
    return (
      <EmptyState
        variant="applications"
        title="No applications yet"
        description="Start applying to rental properties to track your progress here"
        actionLabel="Search Listings"
        onAction={() => window.location.href = "/search"}
      />
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["all", "pending", "shortlisted", "successful", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              filter === tab
                ? "bg-primary-500 text-white shadow-md"
                : "bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-600"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({applications.filter((a) => a.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-200 dark:bg-dark-700" />

        <div className="space-y-6">
          {filtered.map((app, index) => {
            const config = statusConfig[app.status];
            const StatusIcon = config.icon;
            const stepIndex = getStepIndex(app.status);

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-14"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-4 top-6 w-5 h-5 rounded-full border-2 border-white dark:border-dark-800 shadow-md flex items-center justify-center ${
                    app.status === "successful"
                      ? "bg-success-500"
                      : app.status === "rejected"
                      ? "bg-danger-500"
                      : app.status === "shortlisted"
                      ? "bg-warning-500"
                      : "bg-primary-500"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 hover:shadow-md dark:hover:shadow-primary-900/10 transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-dark-900 dark:text-dark-100 mb-1">{app.property_address}</h3>
                      <div className="flex items-center gap-3 text-sm text-dark-500 dark:text-dark-400">
                        <span>{formatCurrency(app.rent_amount)}/week</span>
                        <span>·</span>
                        <span>{app.bedrooms} bed</span>
                        <span>·</span>
                        <span>{timeAgo(app.submitted_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.variant}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === app.id ? null : app.id)}
                          className="p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-dark-400 dark:text-dark-500" />
                        </button>
                        {openMenu === app.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-0 top-8 w-40 bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-xl z-10 py-1"
                          >
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-dark-600 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-600">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                onDelete?.(app.id);
                                setOpenMenu(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex items-center gap-1 mt-4">
                    {statusSteps.map((step, i) => (
                      <div key={step} className="flex-1 flex items-center">
                        <div
                          className={`h-1.5 w-full rounded-full transition-colors ${
                            i <= stepIndex
                              ? app.status === "rejected" && i === statusSteps.length - 1
                                ? "bg-danger-500"
                                : app.status === "successful" && i === statusSteps.length - 1
                                ? "bg-success-500"
                                : "bg-primary-500"
                              : "bg-dark-200 dark:bg-dark-700"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {statusSteps.map((step, i) => (
                      <span
                        key={step}
                        className={`text-[10px] ${
                          i <= stepIndex ? "text-dark-600 dark:text-dark-300 font-medium" : "text-dark-300 dark:text-dark-600"
                        }`}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

