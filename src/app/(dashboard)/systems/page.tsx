import { createClient } from "@/lib/supabase/server";
import { SystemsClient } from "./systems-client";

export default async function SystemsPage() {
  const supabase = await createClient();

  const { data: systems } = await supabase
    .from("systems")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("tier", { ascending: true })
    .order("name");

  return <SystemsClient systems={systems || []} />;
}
