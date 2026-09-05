import "server-only";
import { createHash } from "node:crypto";
import { serviceClient } from "./supabase/server";
import type { Crew } from "./auth";

export async function findInvitation(code: string): Promise<Crew | null> {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) return null;
  const db = serviceClient();
  const { data, error } = await db.from("invitations").select("crew_id,expires_at,max_uses,use_count,revoked_at")
    .eq("code_hash", createHash("sha256").update(code).digest("hex")).maybeSingle();
  if (error) throw new Error("Invitations are temporarily unavailable. Please try again.");
  if (!data || data.revoked_at || data.use_count >= data.max_uses ||
    (data.expires_at && new Date(data.expires_at).getTime() <= Date.now())) return null;
  const crew = await db.from("crews").select("id,public_code,name,welcome_greeting,logo_url,starting_balance_cents")
    .eq("id", data.crew_id).single();
  if (crew.error) throw new Error("Could not load this crew. Please try again.");
  return crew.data;
}
