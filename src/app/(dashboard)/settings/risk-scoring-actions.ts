"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RiskFactorConfig {
  id: string;
  factor_id: string;
  label: string;
  points: number;
  severity: string;
  condition: string;
  reason: string;
  display_order: number;
  is_active: boolean;
}

export interface RiskThresholds {
  id: string;
  high_threshold: number;
  medium_threshold: number;
}

export async function getRiskScoringConfig() {
  const supabase = await createClient();
  const [factorsResult, thresholdsResult] = await Promise.all([
    supabase
      .from("risk_scoring_config")
      .select("*")
      .order("display_order"),
    supabase
      .from("risk_thresholds")
      .select("*")
      .limit(1)
      .single(),
  ]);

  return {
    factors: (factorsResult.data || []) as RiskFactorConfig[],
    thresholds: (thresholdsResult.data || { id: "", high_threshold: 60, medium_threshold: 30 }) as RiskThresholds,
    error: factorsResult.error?.message || thresholdsResult.error?.message || null,
  };
}

export async function updateRiskFactor(
  id: string,
  updates: { points?: number; severity?: string; is_active?: boolean; reason?: string }
) {
  const supabase = await createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can change risk scoring" };

  const { error } = await supabase
    .from("risk_scoring_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function updateRiskThresholds(
  id: string,
  highThreshold: number,
  mediumThreshold: number
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can change risk scoring" };

  const { error } = await supabase
    .from("risk_thresholds")
    .update({
      high_threshold: highThreshold,
      medium_threshold: mediumThreshold,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
