"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createActionItem(formData: FormData) {
  const supabase = await createClient();

  const item = {
    title: formData.get("title") as string,
    description: formData.get("description") as string || null,
    priority: formData.get("priority") as string || "medium",
    status: "pending",
    due_date: formData.get("due_date") as string || null,
  };

  const { data, error } = await supabase.from("action_items").insert(item).select().single();
  if (error) return { error: error.message };

  await logAudit(supabase, "create", "action_item", data.id);
  revalidatePath("/actions");
  return { data };
}

export async function updateActionStatus(id: string, status: string) {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase.from("action_items").update(update).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "update", "action_item", id);
  revalidatePath("/actions");
  return { success: true };
}

export async function deleteActionItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("action_items").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, "delete", "action_item", id);
  revalidatePath("/actions");
  return { success: true };
}
