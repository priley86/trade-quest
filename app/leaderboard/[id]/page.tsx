import Link from "next/link";
import { notFound } from "next/navigation";
import { getCrew, requirePlayer } from "../../../lib/auth";
import { crewPlayers } from "../../../lib/crew-players";
import { portfolio } from "../../../lib/dolt";
import { AppShell } from "../../ui";
import { PortfolioView } from "../../portfolio/view";
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requirePlayer();
  const { id } = await params;
  const crew = await getCrew();
  const player = (await crewPlayers()).find(p => p.player_id === id);
  if (!crew || !player) notFound();
  let data;
  let unavailable = false;
  try { data = await portfolio(id); } catch { unavailable = true; }
  if (data && data.crew_public_id !== crew.public_code) notFound();
  return <AppShell profile={profile} active="leaders">{data ? <PortfolioView data={data} firstName={player.display_name} crewName={crew.name} crewCode={crew.public_code} own={false} />
    : <section className="empty-state"><h1>{player.display_name}’s collection</h1><p>{unavailable ? "This portfolio is temporarily unavailable. Please try again soon." : "This explorer is getting their backpack ready."}</p></section>}
    <Link className="text-link" href="/leaderboard">← Back to the crew</Link></AppShell>;
}
