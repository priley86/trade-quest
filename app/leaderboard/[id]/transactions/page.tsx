import Link from "next/link";
import { notFound } from "next/navigation";
import { getCrew, requirePlayer } from "../../../../lib/auth";
import { crewPlayers } from "../../../../lib/crew-players";
import { portfolio } from "../../../../lib/dolt";
import { money } from "../../../../lib/validation";
import { AppShell } from "../../../ui";

export const dynamic = "force-dynamic";

export default async function PlayerTransactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requirePlayer();
  const { id } = await params;
  const crew = await getCrew();
  const player = (await crewPlayers()).find((p) => p.player_id === id);
  if (!crew || !player) notFound();
  const data = await portfolio(id);
  if (!data || data.crew_public_id !== crew.public_code) notFound();
  return (
    <AppShell profile={profile} active="leaders">
      <section className="page-intro">
        <span className="eyebrow">{player.display_name}’s ledger</span>
        <h1>Transaction history</h1>
        <p>A complete record of this explorer’s buys and sells.</p>
      </section>
      <Link className="text-link" href={`/leaderboard/${id}`}>
        ← Back to {player.display_name}’s collection
      </Link>
      <section className="holdings-card transaction-history">
        {!data.trades.length ? (
          <p className="empty-copy">No trades have been recorded yet.</p>
        ) : (
          <div className="transaction-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.executed_at).toLocaleDateString()}</td>
                    <td className={trade.side === "buy" ? "negative" : "positive"}>
                      {trade.side === "buy" ? "Bought" : "Sold"}
                    </td>
                    <td>{trade.display_name}</td>
                    <td>{trade.quantity}</td>
                    <td>{money(trade.price_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
