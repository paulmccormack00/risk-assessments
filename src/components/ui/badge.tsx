import { cn } from "@/lib/utils";

const colorMap = {
  green: "bg-status-green-light text-status-green border-green-200",
  amber: "bg-status-amber-light text-status-amber border-amber-200",
  red: "bg-status-red-light text-status-red border-red-200",
  blue: "bg-status-blue-light text-status-blue border-blue-200",
  purple: "bg-brand-light text-brand border-brand-mid",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  gray: "bg-gray-100 text-text-muted border-gray-200",
};

interface BadgeProps {
  children: React.ReactNode;
  color?: keyof typeof colorMap;
  className?: string;
}

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
