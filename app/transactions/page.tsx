import Link from "next/link";
import { requirePlayer } from "../../lib/auth";
import { portfolio } from "../../lib/dolt";
import { money } from "../../lib/validation";
import { AppShell } from "../ui";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { profile } = await requirePlayer();
  const data = await portfolio(profile.public_player_id);
  const trades = data?.trades ?? [];
  return (
    <AppShell profile={profile} active="home">
      <section className="page-intro">
        <span className="eyebrow">Your ledger</span>
        <h1>Transaction history</h1>
        <p>A complete record of your buys and sells.</p>
      </section>
      <Link className="text-link" href="/">
        ← Back to portfolio
      </Link>
      <section className="holdings-card transaction-history">
        {!trades.length ? (
          <p className="empty-copy">
            Your trades will appear here after your first purchase.
          </p>
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
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.executed_at).toLocaleDateString()}</td>
                    <td
                      className={trade.side === "buy" ? "negative" : "positive"}
                    >
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
