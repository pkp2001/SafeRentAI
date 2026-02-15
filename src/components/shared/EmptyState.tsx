import { motion } from "framer-motion";
import { Search, FileText, Heart, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "listings" | "applications" | "saved" | "default";
}

const variantIcons: Record<string, LucideIcon> = {
  listings: Search,
  applications: FileText,
  saved: Heart,
  default: Search,
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-20 h-20 rounded-2xl bg-dark-100 dark:bg-dark-700 flex items-center justify-center mb-6"
      >
        <Icon className="w-10 h-10 text-dark-400 dark:text-dark-500" />
      </motion.div>
      <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-100 mb-2">{title}</h3>
      <p className="text-dark-500 dark:text-dark-400 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

