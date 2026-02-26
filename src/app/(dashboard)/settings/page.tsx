import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import { RiskScoringClient } from "./risk-scoring-client";
import type { RiskFactorConfig, RiskThresholds } from "./risk-scoring-actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const [moduleSettingsResult, riskFactorsResult, riskThresholdsResult] = await Promise.all([
    supabase.from("module_settings").select("*").order("module"),
    supabase.from("risk_scoring_config").select("*").order("display_order"),
    supabase.from("risk_thresholds").select("*").limit(1).single(),
  ]);

  const isAdmin = profile?.role === "admin";

  return (
    <div className="max-w-4xl space-y-8">
      <SettingsClient
        isAdmin={isAdmin}
        modules={moduleSettingsResult.data || []}
      />
      <RiskScoringClient
        isAdmin={isAdmin}
        factors={(riskFactorsResult.data || []) as RiskFactorConfig[]}
        thresholds={(riskThresholdsResult.data || { id: "", high_threshold: 60, medium_threshold: 30 }) as RiskThresholds}
      />
    </div>
  );
}
