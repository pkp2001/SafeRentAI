import { Shield, AlertCircle } from "lucide-react";
import { type CrimeStats, getSafetyLevel, getTrendIcon } from "@/lib/crimeData";
import { useTheme } from "@/hooks/useTheme";

interface CrimeDetailsPanelProps {
  crimeStats: CrimeStats;
}

export function CrimeDetailsPanel({ crimeStats }: CrimeDetailsPanelProps) {
  const safety = getSafetyLevel(crimeStats.safetyScore);
  const trend = getTrendIcon(crimeStats.trend);
  const { theme } = useTheme();

  return (
    <div className="mt-6 p-6 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-lg flex items-center gap-2 text-dark-900 dark:text-dark-100">
          <Shield className="w-5 h-5" />
          Area Safety Information
        </h4>

        {/* Safety badge */}
        <div
          className="px-4 py-2 rounded-full text-sm font-medium"
          style={{
            backgroundColor:
              theme === "dark" ? safety.darkBgColor : safety.bgColor,
            color: theme === "dark" ? safety.darkColor : safety.color,
          }}
        >
          {safety.label}
        </div>
      </div>

      {/* Stats grid */}
      <div className="space-y-3">
        {/* Safety Score */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            Safety Score
          </span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${crimeStats.safetyScore}%`,
                  backgroundColor:
                    theme === "dark" ? safety.darkColor : safety.color,
                }}
              />
            </div>
            <span className="font-semibold text-dark-900 dark:text-dark-100">
              {crimeStats.safetyScore}/100
            </span>
          </div>
        </div>

        {/* Crime Rate */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            Crime Rate (per 100k)
          </span>
          <span className="font-medium text-dark-900 dark:text-dark-100">
            {crimeStats.crimeRate.toLocaleString()}
          </span>
        </div>

        {/* Violent Crime */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            Violent Crime Rate
          </span>
          <span className="font-medium text-dark-900 dark:text-dark-100">
            {crimeStats.violentCrimeRate.toLocaleString()}
          </span>
        </div>

        {/* Property Crime */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            Property Crime Rate
          </span>
          <span className="font-medium text-dark-900 dark:text-dark-100">
            {crimeStats.propertyCrimeRate.toLocaleString()}
          </span>
        </div>

        {/* Trend */}
        <div className="flex justify-between items-center pt-2 border-t border-dark-200 dark:border-dark-700">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            12-Month Trend
          </span>
          <span
            className="font-medium flex items-center gap-1"
            style={{ color: trend.color }}
          >
            {trend.icon} {trend.label}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
        <p className="text-xs text-dark-400 dark:text-dark-500 flex items-start gap-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          Data from {crimeStats.dataSource}, last updated{" "}
          {crimeStats.lastUpdated}. Reflects reported crimes only.
        </p>
      </div>
    </div>
  );
}

