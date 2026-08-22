import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-primary hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        destructive: "bg-destructive text-destructive-foreground shadow-destructive hover:bg-destructive/90",
        outline: "border border-border bg-card text-foreground shadow-card hover:bg-muted",
        ghost: "bg-transparent text-muted-foreground shadow-none hover:bg-muted",
        inverse: "bg-card text-foreground shadow-none hover:bg-muted",
      },
      size: {
        default: "px-4",
        compact: "min-h-9 px-3 text-xs",
        icon: "size-11 shrink-0 px-0",
        iconLarge: "size-12 shrink-0 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";
