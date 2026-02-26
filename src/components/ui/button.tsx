import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const variants = {
  primary:
    "bg-brand text-white border-transparent hover:bg-brand-hover",
  secondary:
    "bg-white text-text-primary border-surface-border hover:bg-gray-50",
  ghost:
    "bg-transparent text-text-muted border-transparent hover:bg-brand-light",
  danger:
    "bg-status-red text-white border-transparent hover:bg-red-700",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  small?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "primary", small, icon, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all border cursor-pointer",
          small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          variants[variant],
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {icon && <span className="flex">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
