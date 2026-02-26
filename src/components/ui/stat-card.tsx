import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
}

export function StatCard({ label, value, sub, color, href }: StatCardProps) {
  const content = (
    <div className={cn(
      "bg-white border border-surface-border rounded-[10px] px-6 py-5 flex-1 min-w-[180px]",
      href && "hover:border-brand/30 hover:shadow-md transition-all cursor-pointer"
    )}>
      <div className="text-[13px] text-text-muted font-medium mb-1">{label}</div>
      <div className={cn("text-[28px] font-bold tracking-tight", color || "text-text-primary")}>{value}</div>
      {sub && <div className="text-xs text-text-light mt-0.5">{sub}</div>}
    </div>
  );

  if (href) return <Link href={href} className="flex-1 min-w-[180px]">{content}</Link>;
  return content;
}
