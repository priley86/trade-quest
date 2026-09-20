import Link from "next/link";
import { notFound } from "next/navigation";
import { getCrew, requirePlayer } from "../../../../../lib/auth";
import { crewPlayers } from "../../../../../lib/crew-players";
import { portfolio, readQuery } from "../../../../../lib/dolt";
import { money, returnPercent } from "../../../../../lib/validation";
import { AppShell } from "../../../../ui";
import { HistoryChart } from "../../../../portfolio/history-chart";

export default async function CrewHoldingPage({
  params,
}: {
  params: Promise<{ id: string; holdingId: string }>;
}) {
  const { profile } = await requirePlayer();
  const { id, holdingId } = await params;
  const crew = await getCrew();
  const player = (await crewPlayers()).find(
    (member) => member.player_id === id,
  );
  if (!crew || !player) notFound();

  const data = await portfolio(id);
  if (!data || data.crew_public_id !== crew.public_code) notFound();
  const holding = data.holdings.find((item) => item.id === holdingId);
  if (!holding) notFound();

  const history = await readQuery<{
    recorded_date: string;
    market_value_cents: number;
  }>(
    `SELECT recorded_date,market_value_cents FROM holding_price_history WHERE holding_id='${holdingId}' ORDER BY recorded_date DESC`,
  );
  const chartValues = [
    {
      date: holding.acquired_at
        ? String(holding.acquired_at).slice(0, 10)
        : String(history[history.length - 1]?.recorded_date ?? ""),
      cents: holding.cost_basis_cents,
    },
    ...[...history].reverse().map((point) => ({
      date: String(point.recorded_date).slice(0, 10),
      cents: Number(point.market_value_cents),
    })),
  ];

  return (
    <AppShell active="leaders" profile={profile}>
      <Link className="text-link" href={`/leaderboard/${id}`}>
        ← Back to {player.display_name}’s collection
      </Link>
      <section className="pokemon-detail">
        <div className="detail-art">
          {holding.image_url ? (
            <img src={holding.image_url} alt="" />
          ) : (
            <div
              className={`category-icon ${holding.asset_type === "stock" ? "stock" : holding.asset_type === "sports_card" ? "sports" : "pokemon"} large`}
            >
              {holding.asset_type === "stock"
                ? "📈"
                : holding.asset_type === "sports_card"
                  ? "⚾"
                  : "◉"}
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">{player.display_name}’s collection</span>
          <h1>{holding.display_name}</h1>
          <p className="detail-price">{money(holding.current_value_cents)}</p>
          <p>
            Current value ·{" "}
            <span
              className={
                holding.current_value_cents >= holding.cost_basis_cents
                  ? "positive"
                  : "negative"
              }
            >
              {returnPercent(
                holding.current_value_cents,
                holding.cost_basis_cents,
              )}
            </span>{" "}
            since purchase
          </p>
        </div>
        <div className="price-history">
          <h2>Holding details</h2>
          <dl className="snapshot-grid">
            <div>
              <dt>Quantity</dt>
              <dd>{holding.quantity}</dd>
            </div>
            <div>
              <dt>Purchase price</dt>
              <dd>{money(holding.cost_basis_cents)}</dd>
            </div>
            <div>
              <dt>Current value</dt>
              <dd>{money(holding.current_value_cents)}</dd>
            </div>
          </dl>
          {holding.product_url && holding.asset_type !== "sports_card" && (
            <a
              className="text-link"
              href={holding.product_url}
              target="_blank"
              rel="noreferrer"
            >
              {holding.asset_type === "stock"
                ? "Yahoo Stock Info"
                : "Review card source"}{" "}
              ↗
            </a>
          )}
        </div>
      </section>
      <section className="chart-card">
        <h2>Recorded value history</h2>
        {chartValues.length > 1 && <HistoryChart values={chartValues} />}
        {history.length ? (
          <ul>
            {history.map((point) => (
              <li key={point.recorded_date}>
                {String(point.recorded_date).slice(0, 10)} ·{" "}
                {money(Number(point.market_value_cents))}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No price data recorded yet. Check back after the next daily update.
          </p>
        )}
      </section>
    </AppShell>
  );
}
