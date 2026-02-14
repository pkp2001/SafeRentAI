import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer dark:focus-visible:ring-offset-dark-900",
  {
    variants: {
      variant: {
        default: "bg-primary-500 text-white shadow-md hover:bg-primary-600 hover:shadow-lg active:scale-[0.98]",
        destructive: "bg-danger-500 text-white shadow-md hover:bg-danger-600 hover:shadow-lg active:scale-[0.98]",
        outline: "border-2 border-dark-200 bg-white hover:bg-dark-50 hover:border-dark-300 active:scale-[0.98] dark:border-dark-600 dark:bg-dark-800 dark:hover:bg-dark-700 dark:hover:border-dark-500 dark:text-dark-200",
        secondary: "bg-dark-100 text-dark-900 hover:bg-dark-200 active:scale-[0.98] dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600",
        ghost: "hover:bg-dark-100 hover:text-dark-900 dark:hover:bg-dark-700 dark:hover:text-dark-200",
        link: "text-primary-500 underline-offset-4 hover:underline",
        success: "bg-success-500 text-white shadow-md hover:bg-success-600 hover:shadow-lg active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
