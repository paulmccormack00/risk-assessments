import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import type { ModuleId } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch module settings
  const { data: moduleSettings } = await supabase
    .from("module_settings")
    .select("module, is_enabled");

  const enabledModules: ModuleId[] = moduleSettings
    ? moduleSettings
        .filter((m) => m.is_enabled)
        .map((m) => m.module as ModuleId)
    : ["entities", "systems", "mapping", "ropa", "assessments", "actions"];

  return (
    <DashboardShell profile={profile} enabledModules={enabledModules}>
      {children}
    </DashboardShell>
  );
}
