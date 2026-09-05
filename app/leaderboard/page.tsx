import { getCrew, requirePlayer } from "../../lib/auth";
import { crewPlayers } from "../../lib/crew-players";
import { leaderboard } from "../../lib/dolt";
import { AppShell, PageIntro } from "../ui";
import { LeaderList } from "./list";
export default async function LeaderboardPage() {
  const { profile } = await requirePlayer();
  const crew = await getCrew();
  if (!crew) return <AppShell profile={profile}><PageIntro eyebrow="Your crew" title="A crew is waiting for you" text="Ask your crew leader to finish your membership before viewing the leaderboard." /></AppShell>;
  const players = await crewPlayers();
  let totals = new Map<string, number>();
  let unavailable = false;
  try { totals = new Map((await leaderboard(crew.public_code)).map(p => [p.player_id, p.total_value_cents])); } catch { unavailable = true; }
  return <AppShell profile={profile} active="leaders"><PageIntro eyebrow={crew.name} title="Crew leaderboard" text="Cheer on your friends and explore their collections." />
    {unavailable ? <p className="notice" role="status">Portfolio values are temporarily unavailable. Please check back soon.</p> : <LeaderList players={players.map(p => ({ ...p, total_value_cents: totals.get(p.player_id) ?? null }))} ownId={profile.public_player_id} />}
  </AppShell>;
}
