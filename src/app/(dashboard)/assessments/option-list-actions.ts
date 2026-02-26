"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getOptionList(questionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_option_lists")
    .select("id, question_id, label, display_order, is_default")
    .eq("question_id", questionId)
    .order("display_order");
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function addOptionToList(questionId: string, label: string) {
  const supabase = await createClient();

  // Get the max display_order for this question
  const { data: existing } = await supabase
    .from("assessment_option_lists")
    .select("display_order")
    .eq("question_id", questionId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

  const { data, error } = await supabase
    .from("assessment_option_lists")
    .insert({
      question_id: questionId,
      label: label.trim(),
      display_order: nextOrder,
      is_default: false,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/assessments");
  return { data, error: null };
}

export async function updateOptionInList(id: string, label: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_option_lists")
    .update({ label: label.trim() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assessments");
  return { success: true };
}

export async function deleteOptionFromList(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_option_lists")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assessments");
  return { success: true };
}
