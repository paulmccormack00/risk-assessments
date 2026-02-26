import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssessmentWizard } from "./assessment-wizard";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessment_instances")
    .select("*, framework:assessment_frameworks(*)")
    .eq("id", id)
    .single();

  if (!assessment) redirect("/assessments");

  const [entitiesResult, systemsResult, pasResult] = await Promise.all([
    supabase.from("entities").select("id, name").order("name"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("processing_activities").select("id, activity").order("activity"),
  ]);

  return (
    <AssessmentWizard
      assessment={assessment}
      entities={entitiesResult.data || []}
      systems={systemsResult.data || []}
      processingActivities={pasResult.data || []}
    />
  );
}
