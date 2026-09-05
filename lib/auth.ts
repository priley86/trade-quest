import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { authConfigured } from "./supabase/config";
import { serverClient } from "./supabase/server";

export type Profile = {
  id: string; first_name: string; last_name: string; role: "player" | "admin";
  public_player_id: string; display_name: string;
};
export type Crew = {
  id: string; public_code: string; name: string; welcome_greeting: string; logo_url: string | null;
  starting_balance_cents: number;
};

export const getViewer = cache(async () => {
  if (!authConfigured()) return null;
  const supabase = await serverClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,first_name,last_name,role,public_player_id,display_name,deletion_pending").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error("Could not load your account. Ask your crew leader to check setup.");
  if (profile?.deletion_pending) return null;
  return { user, profile: profile as Profile | null, supabase };
});

export async function requirePlayer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.profile) redirect("/account");
  return { ...viewer, profile: viewer.profile };
}

export async function requireAdmin() {
  const viewer = await requirePlayer();
  if (viewer.profile.role !== "admin") redirect("/");
  return viewer;
}

export const getCrew = cache(async (): Promise<Crew | null> => {
  const { user, supabase } = await requirePlayer();
  const { data, error } = await supabase.from("crew_members").select("crew_id").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your crew.");
  if (!data) return null;
  const result = await supabase.from("crews").select("*").eq("id", data.crew_id).single();
  if (result.error) throw new Error("Could not load your crew.");
  return result.data as Crew;
});
