import { createClient } from "@/lib/supabase/server";
import { ActionsClient } from "./actions-client";

export default async function ActionsPage() {
  const supabase = await createClient();

  const { data: actions } = await supabase
    .from("action_items")
    .select("*, assessment:assessment_instances(id, title)")
    .order("created_at", { ascending: false });

  return <ActionsClient actions={actions || []} />;
}
