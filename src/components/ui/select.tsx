import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[] | string[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-md border border-surface-border text-sm text-text-primary bg-surface-bg",
            "focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand",
            className
          )}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => {
            const value = typeof opt === "string" ? opt : opt.value;
            const label = typeof opt === "string" ? opt : opt.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
