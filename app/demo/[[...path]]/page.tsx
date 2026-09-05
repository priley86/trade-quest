import Link from "next/link";
import { notFound } from "next/navigation";
import { demoPlayers } from "../../../lib/demo";
import { AppShell, PageIntro } from "../../ui";
import { PortfolioView } from "../../portfolio/view";
import { LeaderList } from "../../leaderboard/list";
import { TradeOptions, CategoryPreview, options } from "../../trade/options";
export default async function DemoPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  let content;
  let active = "home";
  if (!path.length) content = <PortfolioView data={demoPlayers[1]} firstName="Jamie" crewName="Pine Ridge Explorers" crewCode="PINE-742" base="/demo" />;
  else if (path[0] === "trade" && path.length <= 2) {
    active = "trade";
    if (path[1] && !options.some(o => o.type === path[1])) notFound();
    content = path[1] ? <CategoryPreview category={path[1]} base="/demo" /> : <TradeOptions base="/demo" />;
  } else if (path[0] === "leaderboard" && path.length <= 2) {
    active = "leaders";
    const player = demoPlayers.find(p => p.player_id === path[1]);
    if (path[1] && !player) notFound();
    content = player ? <><PortfolioView data={player} firstName={player.display_name} crewName="Pine Ridge Explorers" crewCode="PINE-742" own={false} /><Link className="text-link" href="/demo/leaderboard">← Back to the crew</Link></>
      : <><PageIntro eyebrow="Pine Ridge Explorers" title="Crew leaderboard" text="Cheer on your friends and explore their collections." /><LeaderList players={demoPlayers.map(p => ({ ...p, total_value_cents: p.cash_cents + p.holdings.reduce((n, h) => n + h.current_value_cents, 0) }))} ownId="jamie" base="/demo" /></>;
  } else notFound();
  return <AppShell demo active={active}>{content}</AppShell>;
}
