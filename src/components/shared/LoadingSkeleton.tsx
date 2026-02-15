import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "list" | "text" | "avatar" | "image";
  count?: number;
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-dark-100 via-dark-200 to-dark-100 dark:from-dark-700 dark:via-dark-600 dark:to-dark-700 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

export function LoadingSkeleton({ className, variant = "card", count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "card") {
    return (
      <div className={cn("grid gap-6", className)}>
        {items.map((i) => (
          <div key={i} className="rounded-xl border border-dark-200 dark:border-dark-700 p-0 overflow-hidden">
            <Shimmer className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <Shimmer className="h-6 w-3/4" />
              <Shimmer className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Shimmer className="h-4 w-16" />
                <Shimmer className="h-4 w-16" />
                <Shimmer className="h-4 w-16" />
              </div>
              <Shimmer className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        {items.map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-dark-200 dark:border-dark-700">
            <Shimmer className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-5 w-3/4" />
              <Shimmer className="h-4 w-1/2" />
            </div>
            <Shimmer className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("space-y-3", className)}>
        {items.map((i) => (
          <Shimmer key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div className={cn("flex gap-3", className)}>
        {items.map((i) => (
          <Shimmer key={i} className="h-10 w-10 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {items.map((i) => (
        <Shimmer key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

