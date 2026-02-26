import { cn } from "@/lib/utils";

const colorMap = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  blue: "bg-status-blue",
  purple: "bg-brand",
  gray: "bg-text-light",
};

interface StatusDotProps {
  color: keyof typeof colorMap;
}

export function StatusDot({ color }: StatusDotProps) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", colorMap[color])} />
  );
}
