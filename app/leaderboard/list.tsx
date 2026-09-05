import Link from "next/link";
import { money } from "../../lib/validation";
export type LeaderRow = { player_id: string; display_name: string; total_value_cents: number | null };
export function LeaderList({ players, ownId, base = "" }: { players: LeaderRow[]; ownId?: string; base?: string }) {
  const ranked = [...players].sort((a, b) => (b.total_value_cents ?? -1) - (a.total_value_cents ?? -1) || a.player_id.localeCompare(b.player_id));
  return <section className="leaderboard"><div className="leader-heading"><span>Rank & explorer</span><span>Total treasure</span></div>
    {!ranked.length && <p className="empty-copy">Your crew’s first explorer will appear here soon.</p>}
    {ranked.map((p, index) => <Link href={`${base}/leaderboard/${p.player_id}`} className={`ranking-row ${p.player_id === ownId ? "you" : ""}`} key={p.player_id}>
      <span className="rank">{p.total_value_cents === null ? "—" : `#${index + 1}`}</span><span className="avatar blue">{p.display_name[0]}</span>
      <b>{p.display_name}{p.player_id === ownId && <small> · You</small>}</b><strong>{p.total_value_cents === null ? "Getting ready" : money(p.total_value_cents)}</strong><span aria-hidden="true">›</span>
    </Link>)}
  </section>;
}
