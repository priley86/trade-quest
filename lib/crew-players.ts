import "server-only";
import { getCrew } from "./auth";
import { serviceClient } from "./supabase/server";
// Never expose Auth IDs or private names through the public game ledger.
export async function crewPlayers() {
  const crew = await getCrew();
  if (!crew) return [];
  const { data, error } = await serviceClient().from("profiles")
    .select("public_player_id,first_name,last_name,crew_members!inner(crew_id)").eq("crew_members.crew_id", crew.id).limit(500);
  if (error) throw new Error("Could not load the crew roster.");
  return data.map(p => ({ player_id: p.public_player_id as string, display_name: `${p.first_name} ${p.last_name}` }));
}
