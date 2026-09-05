import Link from "next/link";
import { CategoryIcon, StatCard } from "../ui";
import { money, returnPercent } from "../../lib/validation";
import type { Portfolio, Snapshot } from "../../lib/dolt";
import { SellButton } from "./sell";

function History({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return <section className="chart-card"><h2>Treasure over time</h2><p>Your chart will appear after at least two daily value checks.</p></section>;
  const values = snapshots.map(s => s.total_value_cents);
  const min = Math.min(...values), max = Math.max(...values);
  const spread = Math.max(max - min, 100);
  const points = values.map((n, i) => `${34 + i / (values.length - 1) * 732},${170 - (n - min) / spread * 140}`).join(" ");
  return <section className="chart-card"><h2>Treasure over time</h2>
    <svg viewBox="0 0 800 220" className="history-chart" role="img" aria-label={`Portfolio value from ${money(values[0])} to ${money(values[values.length - 1])}`}><line x1="34" y1="30" x2="34" y2="170" stroke="#9bb5c5" /><line x1="34" y1="170" x2="766" y2="170" stroke="#9bb5c5" /><line x1="34" y1="100" x2="766" y2="100" stroke="#dce8ee" strokeDasharray="4 6" /><polyline points={points} fill="none" stroke="#087eaf" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /><text x="20" y="35" textAnchor="end" fontSize="12">{money(max)}</text><text x="20" y="174" textAnchor="end" fontSize="12">{money(min)}</text></svg>
    <div className="history-labels"><span>{String(snapshots[0].snapshot_date).slice(0, 10)} · {money(values[0])}</span><span>{String(snapshots[snapshots.length - 1].snapshot_date).slice(0, 10)} · {money(values[values.length - 1])}</span></div>
    <details><summary>See daily values</summary><ul>{[...snapshots].reverse().map(s => <li key={String(s.snapshot_date)}>{String(s.snapshot_date).slice(0, 10)}: {money(s.total_value_cents)}</li>)}</ul></details>
  </section>;
}
export function PortfolioView({ data, firstName, crewName, crewCode, own = true, base = "" }: { data: Portfolio; firstName: string; crewName: string; crewCode: string; own?: boolean; base?: string }) {
  const invested = data.holdings.reduce((n, h) => n + h.current_value_cents, 0);
  return <>
    <section className="hero-strip"><div><span className="eyebrow">{crewName} · Crew {crewCode}</span><h1>{own ? `Hey, ${firstName}! Ready for today’s quest?` : `${firstName}’s collection`}</h1><p>{own ? "Your next investing adventure starts here." : "Cheer on a fellow explorer."}</p></div></section>
    <section className="stats-grid" aria-label="Portfolio summary">
      <StatCard label="Total treasure" value={money(data.cash_cents + invested)} note="Cash + collection value" tone="blue" icon="🏆" />
      <StatCard label="Spending cash" value={money(data.cash_cents)} note="Pretend money for the game" tone="yellow" icon="💰" />
      <StatCard label="Invested" value={money(invested)} note={`${data.holdings.length} items in the collection`} tone="green" icon="🚀" />
    </section><History snapshots={data.snapshots} />
    {own && <section className="action-grid">
      <Link className="quest-button trade" href={`${base}/trade`}><span>🛒</span><div><b>Trade something</b><small>Explore stocks and cards</small></div><i>›</i></Link>
      <Link className="quest-button crew" href={`${base}/leaderboard`}><span>🏅</span><div><b>Crew leaderboard</b><small>Cheer on your friends</small></div><i>›</i></Link>
    </section>}
    <section className="holdings-card"><div className="section-heading"><h2>{own ? "Your collection" : "Collection"}</h2></div>
      {!data.holdings.length ? <p className="empty-copy">The backpack is empty. Trading opens in a future quest!</p> : <div className="holding-list">{data.holdings.map(h => <Link className="holding-row" key={h.id} href={`/portfolio/${h.id}`}>
        <CategoryIcon type={h.asset_type === "stock" ? "stock" : h.asset_type === "pokemon_card" ? "pokemon" : "sports"} />
        <div className="holding-name"><b>{h.display_name}</b><small>{h.quantity} {h.asset_type === "stock" ? "shares" : "cards"} · Cost {money(h.cost_basis_cents)}</small></div>
        <div className="holding-value"><b>{money(h.current_value_cents)}</b><span className={h.current_value_cents >= h.cost_basis_cents ? "positive" : "negative"}>{h.current_value_cents >= h.cost_basis_cents ? "+" : ""}{money(h.current_value_cents - h.cost_basis_cents)} · {returnPercent(h.current_value_cents, h.cost_basis_cents)}</span>{own && <SellButton id={h.id} />}</div>
      </Link>)}</div>}
    </section>
  </>;
}
