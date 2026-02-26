import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: entityCount },
    { count: systemCount },
    { count: paCount },
    { count: assessmentCount },
    { data: assessments },
    { data: actionItems },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from("entities").select("*", { count: "exact", head: true }),
    supabase.from("systems").select("*", { count: "exact", head: true }),
    supabase.from("processing_activities").select("*", { count: "exact", head: true }),
    supabase.from("assessment_instances").select("*", { count: "exact", head: true }).neq("status", "archived"),
    supabase
      .from("assessment_instances")
      .select("id, title, status, risk_score, risk_classification, created_at, completed_at")
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("action_items")
      .select("id, title, priority, status, due_date, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <DashboardClient
      stats={{
        entities: entityCount || 0,
        systems: systemCount || 0,
        processingActivities: paCount || 0,
        assessments: assessmentCount || 0,
      }}
      assessments={assessments || []}
      actionItems={actionItems || []}
      recentAudit={recentAudit || []}
    />
  );
}
