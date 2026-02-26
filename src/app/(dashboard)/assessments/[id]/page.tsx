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

  const [entitiesResult, systemsResult, pasResult, optionListsResult] = await Promise.all([
    supabase.from("entities").select("id, name").order("name"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("processing_activities").select("id, activity").order("activity"),
    supabase.from("assessment_option_lists").select("id, question_id, label, display_order, is_default").order("display_order"),
  ]);

  // Group option lists by question_id
  const editableOptions: Record<string, { id: string; label: string; is_default: boolean }[]> = {};
  for (const opt of optionListsResult.data || []) {
    if (!editableOptions[opt.question_id]) editableOptions[opt.question_id] = [];
    editableOptions[opt.question_id].push({ id: opt.id, label: opt.label, is_default: opt.is_default });
  }

  return (
    <AssessmentWizard
      assessment={assessment}
      entities={entitiesResult.data || []}
      systems={systemsResult.data || []}
      processingActivities={pasResult.data || []}
      editableOptions={editableOptions}
    />
  );
}
