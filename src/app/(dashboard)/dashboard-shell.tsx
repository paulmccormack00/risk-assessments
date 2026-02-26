"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Profile } from "@/lib/types";
import type { ModuleId } from "@/lib/constants";

interface Props {
  profile: Profile | null;
  enabledModules: ModuleId[];
  children: React.ReactNode;
}

export function DashboardShell({ profile, enabledModules, children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar enabledModules={enabledModules} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
