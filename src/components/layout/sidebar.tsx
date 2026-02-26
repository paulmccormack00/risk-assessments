"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Building2, Server, GitBranch,
  FileText, ShieldCheck, CheckSquare, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, type ModuleId } from "@/lib/constants";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  Building2: <Building2 size={18} />,
  Server: <Server size={18} />,
  GitBranch: <GitBranch size={18} />,
  FileText: <FileText size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
  CheckSquare: <CheckSquare size={18} />,
  Settings: <Settings size={18} />,
};

interface SidebarProps {
  enabledModules?: ModuleId[];
}

export function Sidebar({ enabledModules }: SidebarProps) {
  const pathname = usePathname();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Dashboard and Settings are always visible
    if (item.module === null) return true;
    // If no enabledModules passed, show all
    if (!enabledModules) return true;
    return enabledModules.includes(item.module);
  });

  return (
    <aside className="w-60 bg-nav-bg flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight">{APP_NAME}</div>
            <div className="text-white/50 text-[10px]">Informatica by Salesforce</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-nav-hover hover:text-white"
                )}
              >
                <span className={cn("shrink-0", isActive ? "text-white" : "text-white/50")}>
                  {iconMap[item.icon] || <LayoutDashboard size={18} />}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-white/30 text-[10px]">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
