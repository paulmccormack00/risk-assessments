import { createClient } from "@/lib/supabase/server";
import { EntitiesClient } from "./entities-client";

export default async function EntitiesPage() {
  const supabase = await createClient();

  const { data: entities } = await supabase
    .from("entities")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("tier", { ascending: true })
    .order("name");

  return <EntitiesClient entities={entities || []} />;
}
