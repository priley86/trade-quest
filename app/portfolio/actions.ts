"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "../../lib/auth";
import { provisionPortfolio } from "../../lib/dolt";
export async function openPortfolio(): Promise<{ message?: string }> {
  const { supabase, user } = await requirePlayer();
  const { data, error } = await supabase.from("ledger_enrollments").select("player_id,crew_public_id,display_name,starting_balance_cents").eq("user_id", user.id).single();
  if (error || !data) return { message: "Ask your crew leader to finish enrolling your account." };
  try { await provisionPortfolio(data); }
  catch (error) { return { message: error instanceof Error ? error.message : "Portfolio setup is unavailable. Try again shortly." }; }
  revalidatePath("/");
  revalidatePath("/leaderboard");
  return { message: "Your portfolio is ready!" };
}
