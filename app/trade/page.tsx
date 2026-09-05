import { requirePlayer } from "../../lib/auth";
import { AppShell } from "../ui";
import { TradeOptions } from "./options";
export default async function TradePage() {
  const { profile } = await requirePlayer();
  return <AppShell active="trade" profile={profile}><TradeOptions /></AppShell>;
}
