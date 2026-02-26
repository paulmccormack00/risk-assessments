"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getFrameworks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_frameworks")
    .select("id, slug, name, description, version, is_system")
    .order("name");
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function getFramework(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_frameworks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function getDPIASectionsFromUnified(): Promise<{ sections: unknown[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_frameworks")
    .select("sections")
    .in("slug", ["complio-unified-v1", "dpia"])
    .order("slug", { ascending: false })
    .limit(2);
  if (error) return { sections: [], error: error.message };
  if (!data || data.length === 0) return { sections: [], error: "No framework with DPIA sections found" };

  for (const fw of data) {
    const raw = typeof fw.sections === "string" ? JSON.parse(fw.sections) : fw.sections;
    if (Array.isArray(raw)) {
      const dpiaSections = raw.filter((s: { id: string }) => s.id === "dpia");
      if (dpiaSections.length > 0) return { sections: dpiaSections };
    }
  }
  return { sections: [], error: "DPIA sections not found in any framework" };
}

export async function getAssessments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_instances")
    .select("*, framework:assessment_frameworks(name, slug)")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function getAssessment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_instances")
    .select("*, framework:assessment_frameworks(*)")
    .eq("id", id)
    .single();
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createAssessment(
  frameworkId: string,
  title: string,
  links?: {
    entity_id?: string | null;
    linked_system_id?: string | null;
    linked_pa_id?: string | null;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_instances")
    .insert({
      framework_id: frameworkId,
      title,
      status: "draft",
      activated_modules: ["entry", "common_nucleus"],
      entity_id: links?.entity_id || null,
      linked_system_id: links?.linked_system_id || null,
      linked_pa_id: links?.linked_pa_id || null,
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await logAudit(supabase, "create", "assessment", data.id);
  revalidatePath("/assessments");
  return { data, error: null };
}

export async function updateExistingAssessment(
  assessmentId: string,
  title: string,
  links?: {
    entity_id?: string | null;
    linked_system_id?: string | null;
    linked_pa_id?: string | null;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_instances")
    .update({
      title,
      entity_id: links?.entity_id || null,
      linked_system_id: links?.linked_system_id || null,
      linked_pa_id: links?.linked_pa_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId)
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await logAudit(supabase, "update", "assessment", assessmentId);
  revalidatePath("/assessments");
  return { data, error: null };
}

export async function updateAssessmentResponses(
  id: string,
  responses: Record<string, unknown>,
  activatedModules: string[]
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_instances")
    .update({
      responses,
      activated_modules: activatedModules,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assessments");
  return { success: true };
}

export async function completeAssessment(id: string, riskScore: number, riskClassification: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_instances")
    .update({
      status: "completed",
      risk_score: riskScore,
      risk_classification: riskClassification,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "assessment", id);
  revalidatePath("/assessments");
  return { success: true };
}

export async function deleteAssessment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_instances")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "delete", "assessment", id);
  revalidatePath("/assessments");
  return { success: true };
}

export async function reopenAssessment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_instances")
    .update({
      status: "in_progress",
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "assessment", id);
  revalidatePath("/assessments");
  return { success: true };
}

export async function redoAssessment(id: string) {
  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("assessment_instances")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !original) return { error: fetchError?.message || "Assessment not found", data: null };

  const { data, error } = await supabase
    .from("assessment_instances")
    .insert({
      framework_id: original.framework_id,
      title: `${original.title} (Redo)`,
      status: "draft",
      activated_modules: ["entry", "common_nucleus"],
      entity_id: original.entity_id,
      linked_system_id: original.linked_system_id,
      linked_pa_id: original.linked_pa_id,
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await logAudit(supabase, "create", "assessment", data.id);
  revalidatePath("/assessments");
  return { data, error: null };
}

export async function validateAssessment(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("assessment_instances")
    .update({
      status: "validated",
      validated_by: user?.id || null,
      validated_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    // Fallback: store in metadata JSONB field if dedicated columns don't exist
    const { data: existing } = await supabase
      .from("assessment_instances")
      .select("metadata")
      .eq("id", id)
      .single();

    const metadata = (existing?.metadata as Record<string, unknown>) || {};
    metadata.validated_by = user?.id || null;
    metadata.validated_at = now;

    const { error: fallbackError } = await supabase
      .from("assessment_instances")
      .update({
        status: "validated",
        metadata,
        updated_at: now,
      })
      .eq("id", id);

    if (fallbackError) return { error: fallbackError.message };
  }

  await logAudit(supabase, "update", "assessment", id);
  revalidatePath("/assessments");
  return { success: true, validatedAt: now };
}

export async function updateAssessmentOrder(
  orderMap: { id: string; sort_order: number }[]
) {
  const supabase = await createClient();
  const promises = orderMap.map(({ id, sort_order }) =>
    supabase
      .from("assessment_instances")
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq("id", id)
  );
  await Promise.all(promises);
  revalidatePath("/assessments");
  return { success: true };
}

export async function copyAssessment(id: string) {
  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("assessment_instances")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !original) return { error: fetchError?.message || "Assessment not found", data: null };

  const { data, error } = await supabase
    .from("assessment_instances")
    .insert({
      framework_id: original.framework_id,
      title: `${original.title} (Copy)`,
      status: "draft",
      responses: original.responses,
      activated_modules: original.activated_modules,
      entity_id: original.entity_id,
      linked_system_id: original.linked_system_id,
      linked_pa_id: original.linked_pa_id,
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await logAudit(supabase, "create", "assessment", data.id);
  revalidatePath("/assessments");
  return { data, error: null };
}

// --- Action Items from Assessment ---

export async function createActionItemFromAssessment(
  assessmentId: string,
  fields: {
    title: string;
    description: string;
    priority: string;
    due_date?: string | null;
  }
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_items")
    .insert({
      assessment_id: assessmentId,
      title: fields.title,
      description: fields.description,
      priority: fields.priority,
      due_date: fields.due_date || null,
      status: "pending",
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await appendLinkedRecord(assessmentId, "action_item", data.id, fields.title);
  await logAudit(supabase, "create", "action_item", data.id);
  revalidatePath("/actions");
  revalidatePath("/assessments");
  return { data, error: undefined };
}

export async function getActionItemsForAssessment(
  assessmentId: string
): Promise<{ data: Record<string, unknown>[] | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_items")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, data: null };
  return { data, error: undefined };
}

export async function updateActionItemStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "completed") update.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from("action_items")
    .update(update)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/actions");
  revalidatePath("/assessments");
  return {};
}

// --- Linked Records Tracking ---

async function appendLinkedRecord(
  assessmentId: string,
  recordType: string,
  recordId: string,
  recordTitle: string
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("assessment_instances")
    .select("metadata")
    .eq("id", assessmentId)
    .single();

  const metadata = (existing?.metadata as Record<string, unknown>) || {};
  const linkedRecords = (metadata.linked_records as Array<{ type: string; id: string; title: string; created_at: string }>) || [];
  linkedRecords.push({
    type: recordType,
    id: recordId,
    title: recordTitle,
    created_at: new Date().toISOString(),
  });
  metadata.linked_records = linkedRecords;

  await supabase
    .from("assessment_instances")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
}

export async function getAssessmentLinkedRecords(
  assessmentId: string
): Promise<{ data: Array<{ type: string; id: string; title: string; created_at: string }> }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment_instances")
    .select("metadata")
    .eq("id", assessmentId)
    .single();
  const metadata = (data?.metadata as Record<string, unknown>) || {};
  const linkedRecords = (metadata.linked_records as Array<{ type: string; id: string; title: string; created_at: string }>) || [];
  return { data: linkedRecords };
}

// --- Post-Assessment: Create System Record ---

export async function createSystemFromAssessment(
  assessmentId: string,
  systemData: {
    name: string;
    description?: string;
    vendor?: string;
    data_types?: string[];
  }
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("systems")
    .insert({
      name: systemData.name,
      vendor: systemData.vendor || null,
      personal_data: true,
      data_types: (systemData.data_types || []).join(", ") || null,
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await supabase
    .from("assessment_instances")
    .update({ linked_system_id: data.id })
    .eq("id", assessmentId);

  await appendLinkedRecord(assessmentId, "system", data.id, systemData.name);
  await logAudit(supabase, "create", "system", data.id);
  revalidatePath("/assessments");
  revalidatePath("/systems");
  return { data, error: undefined };
}

// --- Post-Assessment: Create Processing Activity ---

export async function createPAFromAssessment(
  assessmentId: string,
  paData: {
    activity: string;
    purpose?: string;
    legal_basis?: string[];
    data_categories?: string[];
  }
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processing_activities")
    .insert({
      function: "Assessment-derived",
      activity: paData.activity,
      purpose: paData.purpose || null,
      legal_basis: paData.legal_basis && paData.legal_basis.length > 0 ? paData.legal_basis : null,
    })
    .select()
    .single();
  if (error) return { error: error.message, data: null };

  await supabase
    .from("assessment_instances")
    .update({ linked_pa_id: data.id })
    .eq("id", assessmentId);

  await appendLinkedRecord(assessmentId, "processing_activity", data.id, paData.activity);
  await logAudit(supabase, "create", "processing_activity", data.id);
  revalidatePath("/assessments");
  revalidatePath("/mapping");
  return { data, error: undefined };
}
