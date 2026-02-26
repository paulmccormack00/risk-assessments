"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCustomFunction(name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_functions")
    .insert({ name });
  if (error) return { error: error.message };
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}

export async function renameCustomFunction(id: string, newName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_functions")
    .update({ name: newName })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}

export async function deleteCustomFunction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_functions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}

/** Check how many processing activities use a given function name */
export async function countPAsUsingFunction(functionName: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("processing_activities")
    .select("id", { count: "exact", head: true })
    .eq("function", functionName);
  return count ?? 0;
}

/**
 * Rename a standard/platform function across all PAs and core activities.
 * This cascades the rename to every record that references the old function name.
 */
export async function editFunction(oldName: string, newName: string) {
  if (!newName.trim()) return { error: "Function name cannot be empty." };
  if (oldName === newName) return { success: true };
  const supabase = await createClient();

  // Rename in processing_activities
  const { error: paError } = await supabase
    .from("processing_activities")
    .update({ function: newName })
    .eq("function", oldName);
  if (paError) return { error: paError.message };

  // Rename in core_activities
  const { error: caError } = await supabase
    .from("core_activities")
    .update({ function: newName })
    .eq("function", oldName);
  if (caError) return { error: caError.message };

  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}

/**
 * Delete/clear a standard function from all PAs and core activities.
 * Sets the function field to "Unassigned" for any PA that referenced it.
 */
export async function deleteFunction(functionName: string) {
  const supabase = await createClient();

  // Clear function from processing_activities
  const { error: paError } = await supabase
    .from("processing_activities")
    .update({ function: "Unassigned" })
    .eq("function", functionName);
  if (paError) return { error: paError.message };

  // Clear function from core_activities
  const { error: caError } = await supabase
    .from("core_activities")
    .update({ function: "Unassigned" })
    .eq("function", functionName);
  if (caError) return { error: caError.message };

  revalidatePath("/mapping");
  revalidatePath("/ropa");
  return { success: true };
}
