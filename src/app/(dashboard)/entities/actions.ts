"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createEntity(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();

  const entity = {
    name,
    country: formData.get("country") as string,
    company_reg_no: formData.get("company_reg_no") as string || null,
    status: formData.get("status") as string || "Active",
    employees: parseInt(formData.get("employees") as string) || 0,
    dpo_requirement: formData.get("dpo_requirement") as string || "Not Assessed",
    priority: formData.get("priority") as string || "Medium",
    tier: parseInt(formData.get("tier") as string) || 3,
    division: formData.get("division") as string || null,
    parent_entity_id: formData.get("parent_entity_id") as string || null,
    ultimate_parent_id: formData.get("ultimate_parent_id") as string || null,
  };

  const { data, error } = await supabase.from("entities").insert(entity).select().single();
  if (error) return { error: error.message };

  await logAudit(supabase, "create", "entity", data.id);
  revalidatePath("/entities");
  return { data };
}

export async function updateEntity(id: string, formData: FormData) {
  const supabase = await createClient();

  const updates = {
    name: formData.get("name") as string,
    country: formData.get("country") as string,
    company_reg_no: formData.get("company_reg_no") as string || null,
    status: formData.get("status") as string,
    employees: parseInt(formData.get("employees") as string) || 0,
    dpo_requirement: formData.get("dpo_requirement") as string,
    priority: formData.get("priority") as string,
    tier: parseInt(formData.get("tier") as string) || 3,
    division: formData.get("division") as string || null,
    dpo_appointed: formData.get("dpo_appointed") === "true",
    dpo_name: formData.get("dpo_name") as string || null,
    dpo_email: formData.get("dpo_email") as string || null,
    controller_registration_status: formData.get("controller_registration_status") as string || null,
    controller_registration_ref: formData.get("controller_registration_ref") as string || null,
    notes: formData.get("notes") as string || null,
    parent_entity_id: formData.get("parent_entity_id") as string || null,
    ultimate_parent_id: formData.get("ultimate_parent_id") as string || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("entities").update(updates).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "entity", id);
  revalidatePath("/entities");
  return { success: true };
}

export async function deleteEntity(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("entities").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "delete", "entity", id);
  revalidatePath("/entities");
  return { success: true };
}

export async function setAsUltimateParent(entityId: string) {
  const supabase = await createClient();

  await supabase
    .from("entities")
    .update({ ultimate_parent_id: entityId, updated_at: new Date().toISOString() })
    .neq("id", entityId);

  await supabase
    .from("entities")
    .update({ ultimate_parent_id: null, updated_at: new Date().toISOString() })
    .eq("id", entityId);

  await logAudit(supabase, "update", "entity", entityId);
  revalidatePath("/entities");
  return { success: true };
}

export async function importEntities(rows: Record<string, string>[]) {
  const supabase = await createClient();

  const { data: existingEntities } = await supabase.from("entities").select("id, name");

  const entityByName = new Map(
    (existingEntities || []).map((e) => [e.name.toLowerCase().trim(), e.id])
  );

  for (const row of rows) {
    const name = (row["Entity Name"] || row["name"] || "").trim();
    if (!name) continue;

    const record: Record<string, unknown> = {
      name,
      country: row["Country"] || row["country"] || "",
      company_reg_no: row["Reg No"] || null,
      division: row["Division"] || null,
      status: row["Status"] || "Active",
      employees: parseInt(row["Employees"] || "0") || 0,
      dpo_requirement: row["DPO Requirement"] || "Not Assessed",
      priority: row["Priority"] || "Medium",
      tier: parseInt(row["Tier"] || "3") || 3,
      dpo_appointed: (row["DPO Appointed"] || "").toLowerCase() === "true" || (row["DPO Appointed"] || "").toLowerCase() === "yes",
      dpo_name: row["DPO Name"] || null,
      dpo_email: row["DPO Email"] || null,
      controller_registration_status: row["Registration Status"] || null,
      controller_registration_ref: row["Registration Ref"] || null,
    };

    const existingId = entityByName.get(name.toLowerCase().trim());
    if (existingId) {
      await supabase.from("entities").update({ ...record, updated_at: new Date().toISOString() }).eq("id", existingId);
    } else {
      const { data } = await supabase.from("entities").insert(record).select("id").single();
      if (data) entityByName.set(name.toLowerCase().trim(), data.id);
    }
  }

  // Second pass: resolve parent/ultimate parent by name
  for (const row of rows) {
    const name = (row["Entity Name"] || row["name"] || "").trim();
    if (!name) continue;
    const entityId = entityByName.get(name.toLowerCase().trim());
    if (!entityId) continue;

    const parentName = (row["Parent Company"] || "").trim();
    const ultimateName = (row["Ultimate Holding Company"] || "").trim();
    const parentId = parentName ? entityByName.get(parentName.toLowerCase().trim()) || null : null;
    const ultimateId = ultimateName ? entityByName.get(ultimateName.toLowerCase().trim()) || null : null;

    if (parentId || ultimateId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (parentId) updates.parent_entity_id = parentId;
      if (ultimateId) updates.ultimate_parent_id = ultimateId;
      await supabase.from("entities").update(updates).eq("id", entityId);
    }
  }

  await logAudit(supabase, "import", "entity", null);
  revalidatePath("/entities");
  return { count: rows.length };
}

export async function reorderEntities(orders: { id: string; sort_order: number }[]) {
  const supabase = await createClient();
  const promises = orders.map((o) =>
    supabase.from("entities").update({ sort_order: o.sort_order }).eq("id", o.id)
  );
  await Promise.all(promises);
  revalidatePath("/entities");
  return { success: true };
}
