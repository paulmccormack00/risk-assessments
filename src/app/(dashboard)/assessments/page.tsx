import { createClient } from "@/lib/supabase/server";
import { AssessmentsClient } from "./assessments-client";

export default async function AssessmentsPage() {
  const supabase = await createClient();

  const { data: assessments } = await supabase
    .from("assessment_instances")
    .select("*, framework:assessment_frameworks(name, slug), entity:entities(id, name), system:systems!assessment_instances_linked_system_id_fkey(id, name), pa:processing_activities!assessment_instances_linked_pa_id_fkey(id, activity)")
    .neq("status", "archived")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const [frameworksResult, entitiesResult, systemsResult, pasResult] = await Promise.all([
    supabase.from("assessment_frameworks").select("id, slug, name, description, version, is_system").order("name"),
    supabase.from("entities").select("id, name").order("name"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("processing_activities").select("id, activity").order("activity"),
  ]);

  return (
    <AssessmentsClient
      assessments={assessments || []}
      frameworks={frameworksResult.data || []}
      entities={entitiesResult.data || []}
      systems={systemsResult.data || []}
      processingActivities={pasResult.data || []}
    />
  );
}
