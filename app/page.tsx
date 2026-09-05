export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCrew, requirePlayer } from "../lib/auth";
import { authConfigured } from "../lib/supabase/config";
import { portfolio } from "../lib/dolt";
import { money } from "../lib/validation";
import { AppShell } from "./ui";
import { PortfolioView } from "./portfolio/view";
import { PortfolioSetup } from "./portfolio/setup";
export default async function Home() {
  if (!authConfigured()) redirect("/demo");
  const { profile } = await requirePlayer();
  const crew = await getCrew();
  if (!crew) return <AppShell profile={profile}><section className="empty-state"><h1>Welcome, {profile.first_name}!</h1><p>{profile.role === "admin" ? "Create your first crew and share an invitation to start the adventure." : "Your crew leader needs to finish your crew membership."}</p>{profile.role === "admin" && <Link className="primary-button" href="/admin">Open crew control center</Link>}</section></AppShell>;
  let data;
  let unavailable = false;
  try { data = await portfolio(profile.public_player_id); } catch { unavailable = true; }
  return <AppShell profile={profile} active="home">{data ? <PortfolioView data={data} firstName={profile.first_name} crewName={crew.name} crewCode={crew.public_code} />
    : <section className="empty-state"><span>🎒</span><h1>Welcome to {crew.name}, {profile.first_name}!</h1><p>{unavailable ? "We can’t reach your portfolio right now. Your crew leader may still be connecting the game ledger." : `Your ${money(crew.starting_balance_cents)} starting backpack is ready to open.`}</p><PortfolioSetup /></section>}</AppShell>;
}
