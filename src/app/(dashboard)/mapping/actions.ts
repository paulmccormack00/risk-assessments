"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// Helper: get multi-value form field as array or null
function getArray(formData: FormData, name: string): string[] | null {
  const values = formData.getAll(name) as string[];
  return values.length > 0 ? values : null;
}

// Helper: link entities to a processing activity (graceful if table doesn't exist)
async function linkEntities(supabase: SupabaseClient, paId: string, entityIds: string[]) {
  if (entityIds.length === 0) return;
  const { error } = await supabase.from("processing_activity_entities").insert(
    entityIds.map((eid) => ({
      processing_activity_id: paId,
      entity_id: eid,
    }))
  );
  // Silently ignore if table doesn't exist yet
  if (error && !error.message.includes("processing_activity_entities")) {
    console.error("Entity link error:", error.message);
  }
}

// Helper: update entity links (delete + re-insert)
async function updateEntityLinks(supabase: SupabaseClient, paId: string, entityIds: string[]) {
  await supabase
    .from("processing_activity_entities")
    .delete()
    .eq("processing_activity_id", paId);
  if (entityIds.length > 0) {
    await linkEntities(supabase, paId, entityIds);
  }
}

export async function createProcessingActivity(formData: FormData) {
  const supabase = await createClient();

  const pa = {
    core_activity_id: formData.get("core_activity_id") as string || null,
    function: formData.get("function") as string,
    activity: formData.get("activity") as string,
    description: formData.get("description") as string || null,
    purpose: formData.get("purpose") as string || null,
    data_subjects: getArray(formData, "data_subjects"),
    data_types: formData.get("data_types") as string || null,
    special_categories: getArray(formData, "special_categories"),
    legal_basis: getArray(formData, "legal_basis"),
    legitimate_interest_detail: formData.get("legitimate_interest_detail") as string || null,
    retention_period: formData.get("retention_period") as string || null,
    recipients: formData.get("recipients") as string || null,
    transfer: formData.get("transfer") === "true",
    transfer_countries: getArray(formData, "transfer_countries"),
    transfer_mechanism: formData.get("transfer_mechanism") as string || null,
    source_of_data: formData.get("source_of_data") as string || null,
    controller_or_processor: formData.get("controller_or_processor") as string || "Controller",
    automated_decision_making: formData.get("automated_decision_making") === "true",
    notes: formData.get("notes") as string || null,
  };

  const { data, error } = await supabase
    .from("processing_activities")
    .insert(pa)
    .select()
    .single();

  if (error) return { error: error.message };

  // Link systems
  const systemIds = formData.getAll("system_ids") as string[];
  if (systemIds.length > 0) {
    await supabase.from("processing_activity_systems").insert(
      systemIds.map((sid) => ({
        processing_activity_id: data.id,
        system_id: sid,
      }))
    );
  }

  // Link entities
  const entityIds = formData.getAll("entity_ids") as string[];
  await linkEntities(supabase, data.id, entityIds);

  await logAudit(supabase, "create", "processing_activity", data.id);
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { data };
}

export async function updateProcessingActivity(id: string, formData: FormData) {
  const supabase = await createClient();

  const updates = {
    activity: formData.get("activity") as string,
    description: formData.get("description") as string || null,
    purpose: formData.get("purpose") as string || null,
    data_subjects: getArray(formData, "data_subjects"),
    data_types: formData.get("data_types") as string || null,
    special_categories: getArray(formData, "special_categories"),
    legal_basis: getArray(formData, "legal_basis"),
    legitimate_interest_detail: formData.get("legitimate_interest_detail") as string || null,
    retention_period: formData.get("retention_period") as string || null,
    recipients: formData.get("recipients") as string || null,
    transfer: formData.get("transfer") === "true",
    transfer_countries: getArray(formData, "transfer_countries"),
    transfer_mechanism: formData.get("transfer_mechanism") as string || null,
    source_of_data: formData.get("source_of_data") as string || null,
    controller_or_processor: formData.get("controller_or_processor") as string || "Controller",
    automated_decision_making: formData.get("automated_decision_making") === "true",
    notes: formData.get("notes") as string || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("processing_activities")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  // Update system links: delete and re-insert
  const systemIds = formData.getAll("system_ids") as string[];
  await supabase
    .from("processing_activity_systems")
    .delete()
    .eq("processing_activity_id", id);
  if (systemIds.length > 0) {
    await supabase.from("processing_activity_systems").insert(
      systemIds.map((sid) => ({
        processing_activity_id: id,
        system_id: sid,
      }))
    );
  }

  // Update entity links
  const entityIds = formData.getAll("entity_ids") as string[];
  await updateEntityLinks(supabase, id, entityIds);

  await logAudit(supabase, "update", "processing_activity", id);
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}

// Helper: split semicolon-delimited string into array or null
function splitToArray(val: string | undefined | null): string[] | null {
  if (!val || !val.trim()) return null;
  return val.split(";").map((s) => s.trim()).filter(Boolean);
}

export async function importProcessingActivities(rows: Record<string, string>[]) {
  const supabase = await createClient();

  // Map CSV columns to DB fields
  const records = rows.map((row) => ({
    function: row["Function"] || "Unassigned",
    activity: row["Processing Activity"] || row["Activity"] || "Imported activity",
    description: row["Description"] || null,
    purpose: row["Purpose"] || null,
    data_subjects: splitToArray(row["Data Subjects"]),
    data_types: row["Personal Data Categories"] || row["Data Types"] || row["Personal Data"] || null,
    special_categories: splitToArray(row["Special Categories"]),
    legal_basis: splitToArray(row["Legal Basis"]),
    legitimate_interest_detail: row["Legitimate Interest Detail"] || null,
    retention_period: row["Retention Period"] || row["Retention"] || null,
    recipients: row["Recipients"] || null,
    transfer: (row["International Transfer"] || row["Transfer"] || "").toLowerCase() === "true"
      || (row["International Transfer"] || row["Transfer"] || "").toLowerCase() === "yes",
    transfer_countries: splitToArray(row["Transfer Countries"]),
    transfer_mechanism: row["Transfer Mechanism"] || row["Mechanism"] || null,
    source_of_data: row["Source of Data"] || row["Source"] || null,
    controller_or_processor: row["Controller/Processor"] || row["Role"] || "Controller",
    automated_decision_making:
      (row["Automated Decision Making"] || row["ADM"] || "").toLowerCase() === "true"
      || (row["Automated Decision Making"] || row["ADM"] || "").toLowerCase() === "yes",
    notes: row["Notes"] || null,
  }));

  const { error } = await supabase.from("processing_activities").insert(records);
  if (error) return { error: error.message };

  await logAudit(supabase, "import", "processing_activity", null);
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { count: records.length };
}

export async function createRopaActivity(formData: FormData) {
  const supabase = await createClient();

  // Auto-generate next ref_id: PA-001, PA-002, etc.
  const { data: existing } = await supabase
    .from("processing_activities")
    .select("ref_id")
    .not("ref_id", "is", null)
    .order("ref_id", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (existing && existing.length > 0 && existing[0].ref_id) {
    const match = existing[0].ref_id.match(/PA-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const refId = `PA-${String(nextNum).padStart(3, "0")}`;

  const pa = {
    ref_id: refId,
    core_activity_id: formData.get("core_activity_id") as string || null,
    function: formData.get("function") as string,
    activity: formData.get("activity") as string,
    description: formData.get("description") as string || null,
    purpose: formData.get("purpose") as string || null,
    data_subjects: getArray(formData, "data_subjects"),
    data_types: formData.get("data_types") as string || null,
    special_categories: getArray(formData, "special_categories"),
    legal_basis: getArray(formData, "legal_basis"),
    legitimate_interest_detail: formData.get("legitimate_interest_detail") as string || null,
    retention_period: formData.get("retention_period") as string || null,
    recipients: formData.get("recipients") as string || null,
    transfer: formData.get("transfer") === "true",
    transfer_countries: getArray(formData, "transfer_countries"),
    transfer_mechanism: formData.get("transfer_mechanism") as string || null,
    source_of_data: formData.get("source_of_data") as string || null,
    controller_or_processor: formData.get("controller_or_processor") as string || "Controller",
    automated_decision_making: formData.get("automated_decision_making") === "true",
    notes: formData.get("notes") as string || null,
  };

  const { data, error } = await supabase
    .from("processing_activities")
    .insert(pa)
    .select()
    .single();

  if (error) return { error: error.message };

  // Link systems
  const systemIds = formData.getAll("system_ids") as string[];
  if (systemIds.length > 0) {
    await supabase.from("processing_activity_systems").insert(
      systemIds.map((sid) => ({
        processing_activity_id: data.id,
        system_id: sid,
      }))
    );
  }

  // Link entities
  const entityIds = formData.getAll("entity_ids") as string[];
  await linkEntities(supabase, data.id, entityIds);

  await logAudit(supabase, "create", "processing_activity", data.id);
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { data };
}

export async function deleteProcessingActivity(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("processing_activities").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, "delete", "processing_activity", id);
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}
