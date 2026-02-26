"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createSystem(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();

  const system = {
    name,
    department: formData.get("department") as string || null,
    owner: formData.get("owner") as string || null,
    tier: parseInt(formData.get("tier") as string) || 3,
    sensitivity: formData.get("sensitivity") as string || null,
    personal_data: formData.get("personal_data") === "true",
    data_subjects: formData.get("data_subjects") as string || null,
    dpa_status: formData.get("dpa_status") as string || "Not Assessed",
    vendor: formData.get("vendor") as string || null,
    is_third_party: formData.get("is_third_party") === "true",
  };

  const { data, error } = await supabase.from("systems").insert(system).select().single();
  if (error) return { error: error.message };

  await logAudit(supabase, "create", "system", data.id);
  revalidatePath("/systems");
  return { data };
}

export async function updateSystem(id: string, formData: FormData) {
  const supabase = await createClient();

  const updates = {
    name: formData.get("name") as string,
    department: formData.get("department") as string || null,
    owner: formData.get("owner") as string || null,
    tier: parseInt(formData.get("tier") as string) || 3,
    operational_tier: parseInt(formData.get("operational_tier") as string) || null,
    data_sensitivity_tier: parseInt(formData.get("data_sensitivity_tier") as string) || null,
    sensitivity: formData.get("sensitivity") as string || null,
    personal_data: formData.get("personal_data") === "true",
    data_subjects: formData.get("data_subjects") as string || null,
    data_types: formData.get("data_types") as string || null,
    special_categories: formData.get("special_categories") as string || null,
    storage_location: formData.get("storage_location") as string || null,
    dpa_status: formData.get("dpa_status") as string || "Not Assessed",
    vendor: formData.get("vendor") as string || null,
    is_third_party: formData.get("is_third_party") === "true",
    notes: formData.get("notes") as string || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("systems").update(updates).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "system", id);
  revalidatePath("/systems");
  return { success: true };
}

export async function deleteSystem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("systems").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "delete", "system", id);
  revalidatePath("/systems");
  return { success: true };
}

export async function importSystems(rows: Record<string, string>[]) {
  const supabase = await createClient();

  const records = rows.map((row) => ({
    name: row["System Name"] || row["Name"] || "Imported system",
    department: row["Department"] || null,
    owner: row["Owner"] || null,
    tier: parseInt(row["Tier"]) || 3,
    sensitivity: row["Sensitivity"] || null,
    personal_data: (row["Personal Data"] || "").toLowerCase() === "true" || (row["Personal Data"] || "").toLowerCase() === "yes",
    data_subjects: row["Data Subjects"] || null,
    data_types: row["Data Types"] || null,
    special_categories: row["Special Categories"] || null,
    storage_location: row["Storage Location"] || null,
    dpa_status: row["DPA Status"] || "Not Assessed",
    vendor: row["Vendor"] || null,
    is_third_party: (row["Third Party"] || "").toLowerCase() === "true" || (row["Third Party"] || "").toLowerCase() === "yes",
  }));

  const { error } = await supabase.from("systems").insert(records);
  if (error) return { error: error.message };

  await logAudit(supabase, "import", "system", null);
  revalidatePath("/systems");
  return { count: records.length };
}

export async function updateSystemTier(id: string, tier: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("systems").update({ tier, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "system", id);
  revalidatePath("/systems");
  return { success: true };
}
