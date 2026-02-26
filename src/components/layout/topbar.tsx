"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface TopbarProps {
  profile: Profile | null;
}

export function Topbar({ profile }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center justify-between px-6 shrink-0">
      <div className="text-sm font-medium text-text-muted">
        Risk Assessments Platform
      </div>

      <div className="flex items-center gap-3">
        {/* User */}
        {profile && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
              {getInitials(profile.full_name || "U")}
            </div>
            <div className="text-sm">
              <div className="font-medium text-text-primary">{profile.full_name}</div>
              <div className="text-[10px] text-text-muted capitalize">{profile.role}</div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
