"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "../../lib/auth";
import { portfolio, sellHolding as sell } from "../../lib/dolt";
import { getStockValueCents } from "../../lib/alpaca";
export async function sellHolding(id: string): Promise<string> {
  const { profile } = await requirePlayer();
  try {
    const data = await portfolio(profile.public_player_id);
    const holding = data?.holdings.find((item) => item.id === id);
    let saleValueCents: number | undefined;
    if (
      holding?.asset_type === "stock" &&
      holding.asset_public_id &&
      holding.asset_public_id !== "TREASURY"
    ) {
      saleValueCents = await getStockValueCents(
        holding.asset_public_id,
        holding.quantity,
      );
    }
    await sell(profile.public_player_id, id, saleValueCents);
    revalidatePath("/");
    revalidatePath("/leaderboard", "layout");
    return "Sold and added to your cash.";
  } catch (error) {
    return error instanceof Error ? error.message : "Couldn’t sell this card.";
  }
}
