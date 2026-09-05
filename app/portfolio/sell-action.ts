"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "../../lib/auth";
import { sellHolding as sell } from "../../lib/dolt";
export async function sellHolding(id: string): Promise<string> { const { profile } = await requirePlayer(); try { await sell(profile.public_player_id, id); revalidatePath("/"); return "Sold and added to your cash."; } catch (error) { return error instanceof Error ? error.message : "Couldn’t sell this card."; } }
