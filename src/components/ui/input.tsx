import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-dark-200 bg-white px-4 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-dark-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:placeholder:text-dark-500 dark:focus-visible:ring-offset-dark-900",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
