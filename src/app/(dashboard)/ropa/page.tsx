import { createClient } from "@/lib/supabase/server";
import { RopaClient } from "./ropa-client";

export default async function RopaPage() {
  const supabase = await createClient();

  const [
    { data: activities },
    { data: systems },
    { data: paSystems },
    { data: allEntities },
    { data: coreActivities },
    { data: paEntities },
  ] = await Promise.all([
    supabase
      .from("processing_activities")
      .select("*")
      .not("ref_id", "is", null)
      .order("ref_id"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("processing_activity_systems").select("processing_activity_id, system_id"),
    supabase.from("entities").select("id, name, country").order("name"),
    supabase.from("core_activities").select("*").order("sort_order"),
    // Fetch PA-entity links (may not exist yet -- graceful fallback)
    supabase.from("processing_activity_entities").select("processing_activity_id, entity_id"),
  ]);

  // Build system lookup
  const systemMap = new Map((systems || []).map((s) => [s.id, s.name]));
  const paSystemsMap = new Map<string, { ids: string[]; names: string[] }>();
  (paSystems || []).forEach((ps) => {
    const entry = paSystemsMap.get(ps.processing_activity_id) || { ids: [], names: [] };
    entry.ids.push(ps.system_id);
    const name = systemMap.get(ps.system_id);
    if (name) entry.names.push(name);
    paSystemsMap.set(ps.processing_activity_id, entry);
  });

  // Build entity lookup
  const entityMap = new Map((allEntities || []).map((e) => [e.id, e]));
  const paEntitiesMap = new Map<string, { ids: string[]; names: string[] }>();
  (paEntities || []).forEach((pe) => {
    const entry = paEntitiesMap.get(pe.processing_activity_id) || { ids: [], names: [] };
    entry.ids.push(pe.entity_id);
    const entity = entityMap.get(pe.entity_id);
    if (entity) entry.names.push(`${entity.name} (${entity.country})`);
    paEntitiesMap.set(pe.processing_activity_id, entry);
  });

  const enrichedActivities = (activities || []).map((pa) => ({
    ...pa,
    system_ids: paSystemsMap.get(pa.id)?.ids || [],
    system_names: paSystemsMap.get(pa.id)?.names || [],
    entity_ids: paEntitiesMap.get(pa.id)?.ids || [],
    entity_names: paEntitiesMap.get(pa.id)?.names || [],
  }));

  return (
    <RopaClient
      activities={enrichedActivities}
      systems={systems || []}
      entities={allEntities || []}
      coreActivities={coreActivities || []}
    />
  );
}
