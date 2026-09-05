"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "../../../lib/auth";
import { buyPokemon } from "../../../lib/dolt";
import type { PokemonProduct } from "../../../lib/tcgplayer";
export async function buyPokemonCard(_state: { message?: string }, product: PokemonProduct): Promise<{ message?: string; success?: boolean }> { const { profile } = await requirePlayer(); try { await buyPokemon(profile.public_player_id, product); revalidatePath("/"); return { success: true, message: `${product.name} was added to your collection!` }; } catch (error) { return { message: error instanceof Error ? error.message : "Couldn’t buy this card." }; } }
