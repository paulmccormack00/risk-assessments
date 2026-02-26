import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        {hint && (
          <div className="text-[11px] text-text-light mb-1">{hint}</div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-md border border-surface-border text-sm text-text-primary bg-surface-bg",
            "focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand",
            "placeholder:text-text-light",
            error && "border-status-red",
            className
          )}
          {...props}
        />
        {error && (
          <div className="text-xs text-status-red mt-1">{error}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
