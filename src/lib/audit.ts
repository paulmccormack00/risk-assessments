import { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  action: "create" | "update" | "delete" | "import",
  entityType: string,
  entityId: string | null,
  changes?: Record<string, { old: unknown; new: unknown }>
) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("audit_logs").insert({
    user_id: user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  });
}
