import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-900",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-500 text-white",
        secondary: "border-transparent bg-dark-100 text-dark-900 dark:bg-dark-700 dark:text-dark-200",
        destructive: "border-transparent bg-danger-500 text-white",
        success: "border-transparent bg-success-500 text-white",
        warning: "border-transparent bg-warning-500 text-white",
        outline: "text-dark-900 border-dark-200 dark:text-dark-200 dark:border-dark-600",
        safe: "border-transparent bg-success-50 text-success-600 dark:bg-success-700/20 dark:text-success-200",
        risky: "border-transparent bg-danger-50 text-danger-600 dark:bg-danger-700/20 dark:text-danger-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
