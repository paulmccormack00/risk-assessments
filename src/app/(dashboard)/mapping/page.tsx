import { createClient } from "@/lib/supabase/server";
import { MappingClient } from "./mapping-client";

export default async function MappingPage() {
  const supabase = await createClient();

  const [
    { data: coreActivities },
    { data: processingActivities },
    { data: systems },
    { data: paSystems },
    { data: allEntities },
    { data: customFunctions },
  ] = await Promise.all([
    supabase.from("core_activities").select("*").order("sort_order"),
    supabase.from("processing_activities").select("*"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("processing_activity_systems").select("processing_activity_id, system_id"),
    supabase.from("entities").select("id, name, country").order("name"),
    supabase.from("custom_functions").select("id, name").order("name"),
  ]);

  const systemMap = new Map((systems || []).map((s) => [s.id, s.name]));
  const paSystemsMap = new Map<string, { ids: string[]; names: string[] }>();
  (paSystems || []).forEach((ps) => {
    const entry = paSystemsMap.get(ps.processing_activity_id) || { ids: [], names: [] };
    entry.ids.push(ps.system_id);
    const name = systemMap.get(ps.system_id);
    if (name) entry.names.push(name);
    paSystemsMap.set(ps.processing_activity_id, entry);
  });

  const enrichPA = (pa: Record<string, unknown>) => ({
    ...pa,
    system_ids: paSystemsMap.get(pa.id as string)?.ids || [],
    system_names: paSystemsMap.get(pa.id as string)?.names || [],
  });

  const grouped = (coreActivities || []).map((ca) => ({
    ...ca,
    processing_activities: (processingActivities || [])
      .filter((pa) => pa.core_activity_id === ca.id)
      .map(enrichPA),
  }));

  return (
    <MappingClient
      coreActivities={grouped}
      systems={systems || []}
      entities={allEntities || []}
      customFunctions={(customFunctions || []).map((cf) => ({ id: cf.id, name: cf.name }))}
    />
  );
}
