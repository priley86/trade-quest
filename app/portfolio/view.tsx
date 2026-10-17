import Link from "next/link";
import { CategoryIcon, StatCard } from "../ui";
import { money, returnPercent } from "../../lib/validation";
import type { Portfolio, Snapshot } from "../../lib/dolt";
import { SellButton } from "./sell";
import { getStockValueCents } from "../../lib/alpaca";

function History({
  snapshots,
  startingBalanceCents,
}: {
  snapshots: Snapshot[];
  startingBalanceCents: number;
}) {
  const points = snapshots.length
    ? [
        {
          snapshot_date: previousDay(snapshots[0].snapshot_date),
          total_value_cents: startingBalanceCents,
        },
        ...snapshots,
      ]
    : snapshots;
  if (points.length < 2)
    return (
      <section className="chart-card">
        <h2>Treasure over time</h2>
        <p>Your chart will appear after at least two daily value checks.</p>
      </section>
    );
  const values = points.map((s) => s.total_value_cents);
  const min = Math.min(...values),
    max = Math.max(...values);
  const spread = Math.max(max - min, 100);
  const chartPoints = values
    .map(
      (n, i) =>
        `${34 + (i / (values.length - 1)) * 732},${170 - ((n - min) / spread) * 140}`,
    )
    .join(" ");
  return (
    <section className="chart-card">
      <h2>Treasure over time</h2>
      <svg
        viewBox="0 0 800 220"
        className="history-chart"
        role="img"
        aria-label={`Portfolio value from ${money(values[0])} to ${money(values[values.length - 1])}`}
      >
        <line x1="34" y1="30" x2="34" y2="170" stroke="#9bb5c5" />
        <line x1="34" y1="170" x2="766" y2="170" stroke="#9bb5c5" />
        <line
          x1="34"
          y1="100"
          x2="766"
          y2="100"
          stroke="#dce8ee"
          strokeDasharray="4 6"
        />
        <polyline
          points={chartPoints}
          fill="none"
          stroke="#087eaf"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text x="20" y="35" textAnchor="end" fontSize="12">
          {money(max)}
        </text>
        <text x="20" y="174" textAnchor="end" fontSize="12">
          {money(min)}
        </text>
      </svg>
      <div className="history-labels">
        <span>
          {String(points[0].snapshot_date).slice(0, 10)} · {money(values[0])}
        </span>
        <span>
          {String(points[points.length - 1].snapshot_date).slice(0, 10)} ·{" "}
          {money(values[values.length - 1])}
        </span>
      </div>
      <details>
        <summary>See daily values</summary>
        <ul>
          {[...points].reverse().map((s) => (
            <li key={String(s.snapshot_date)}>
              {String(s.snapshot_date).slice(0, 10)}:{" "}
              {money(s.total_value_cents)}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
function previousDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
function realizedGainCents(trades: Portfolio["trades"]) {
  const lots = new Map<string, { quantity: number; unitCost: number }[]>();
  let realized = 0;
  for (const trade of [...trades].reverse()) {
    const key = `${trade.asset_type}:${trade.asset_public_id}`;
    const assetLots = lots.get(key) || [];
    if (trade.side === "buy") {
      assetLots.push({
        quantity: trade.quantity,
        unitCost: trade.price_cents / trade.quantity,
      });
    } else {
      let remaining = trade.quantity;
      let cost = 0;
      while (remaining > 0 && assetLots.length) {
        const lot = assetLots[0];
        const quantity = Math.min(remaining, lot.quantity);
        cost += quantity * lot.unitCost;
        lot.quantity -= quantity;
        remaining -= quantity;
        if (lot.quantity <= 0.0000001) assetLots.shift();
      }
      realized += trade.price_cents - cost;
    }
    lots.set(key, assetLots);
  }
  return Math.round(realized);
}
export async function PortfolioView({
  data,
  firstName,
  crewName,
  crewCode,
  own = true,
  base = "",
  startingBalanceCents = 100000,
}: {
  data: Portfolio;
  firstName: string;
  crewName: string;
  crewCode: string;
  own?: boolean;
  base?: string;
  startingBalanceCents?: number;
}) {
  const liveHoldings = await Promise.all(
    data.holdings.map(async (holding) => {
      if (
        holding.asset_type !== "stock" ||
        !holding.asset_public_id ||
        holding.asset_public_id === "TREASURY"
      ) {
        return holding;
      }
      try {
        return {
          ...holding,
          current_value_cents: await getStockValueCents(
            holding.asset_public_id,
            holding.quantity,
          ),
        };
      } catch {
        return holding;
      }
    }),
  );
  const displayData = { ...data, holdings: liveHoldings };
  const invested = displayData.holdings.reduce(
    (n, h) => n + h.current_value_cents,
    0,
  );
  const realized = realizedGainCents(data.trades);
  const unrealized = displayData.holdings.reduce(
    (n, h) => n + h.current_value_cents - h.cost_basis_cents,
    0,
  );
  const netGain = displayData.cash_cents + invested - startingBalanceCents;
  return (
    <>
      <section className="hero-strip">
        <div>
          <span className="eyebrow">
            {crewName} · Crew {crewCode}
          </span>
          <h1>
            {own
              ? `Hey, ${firstName}! Ready for today’s quest?`
              : `${firstName}’s collection`}
          </h1>
          <p>
            {own
              ? "Your next investing adventure starts here."
              : "Cheer on a fellow explorer."}
          </p>
        </div>
      </section>
      <section className="stats-grid" aria-label="Portfolio summary">
        <StatCard
          label="Total treasure"
          value={money(displayData.cash_cents + invested)}
          note="Cash + collection value"
          tone="blue"
          icon="🏆"
        />
        <StatCard
          label="Spending cash"
          value={money(displayData.cash_cents)}
          note="Pretend money for the game"
          tone="yellow"
          icon="💰"
        />
        <StatCard
          label="Invested"
          value={money(invested)}
          note={`${displayData.holdings.length} items in the collection`}
          tone="green"
          icon="🚀"
        />
      </section>
      <History
        snapshots={data.snapshots}
        startingBalanceCents={startingBalanceCents}
      />
      <Link
        className="text-link"
        href={own ? "/transactions" : `/leaderboard/${data.player_id}/transactions`}
      >
        View full transaction history →
      </Link>
      <section aria-labelledby="portfolio-stats-heading">
        <h2 id="portfolio-stats-heading">Portfolio stats</h2>
        <div className="stats-grid">
          <StatCard
            label="Realized gain/loss"
            value={money(realized)}
            note="Closed positions"
            tone={realized >= 0 ? "green" : "yellow"}
            icon="↔️"
          />
          <StatCard
            label="Unrealized gain/loss"
            value={money(unrealized)}
            note="Current holdings"
            tone={unrealized >= 0 ? "green" : "yellow"}
            icon="📊"
          />
          <StatCard
            label="Net gain/loss"
            value={money(netGain)}
            note="Compared with starting balance"
            tone={netGain >= 0 ? "green" : "yellow"}
            icon="🏁"
          />
        </div>
      </section>
      {own && (
        <section className="action-grid">
          <Link className="quest-button trade" href={`${base}/trade`}>
            <span>🛒</span>
            <div>
              <b>Trade something</b>
              <small>Explore stocks and cards</small>
            </div>
            <i>›</i>
          </Link>
          <Link className="quest-button crew" href={`${base}/leaderboard`}>
            <span>🏅</span>
            <div>
              <b>Crew leaderboard</b>
              <small>Cheer on your friends</small>
            </div>
            <i>›</i>
          </Link>
        </section>
      )}
      <section className="holdings-card">
        <div className="section-heading">
          <h2>{own ? "Your collection" : "Collection"}</h2>
        </div>
        {!displayData.holdings.length ? (
          <p className="empty-copy">
            The backpack is empty. Trading opens in a future quest!
          </p>
        ) : (
          <div className="holding-list">
            {displayData.holdings.map((h) => (
              <Link
                className="holding-row"
                key={h.id}
                href={
                  own
                    ? `/portfolio/${h.id}`
                    : `/leaderboard/${data.player_id}/holding/${h.id}`
                }
              >
                <CategoryIcon
                  type={
                    h.asset_type === "stock"
                      ? "stock"
                      : h.asset_type === "pokemon_card"
                        ? "pokemon"
                        : "sports"
                  }
                sport={h.sport_segment}
                symbol={h.asset_public_id}
                />
                <div className="holding-name">
                  <b>{h.display_name}</b>
                  <small>
                    {h.quantity} {h.asset_type === "stock" ? "shares" : "cards"}{" "}
                    · Cost {money(h.cost_basis_cents)}
                  </small>
                </div>
                <div className="holding-value">
                  <b>{money(h.current_value_cents)}</b>
                  <span
                    className={
                      h.current_value_cents >= h.cost_basis_cents
                        ? "positive"
                        : "negative"
                    }
                  >
                    {h.current_value_cents >= h.cost_basis_cents ? "+" : ""}
                    {money(h.current_value_cents - h.cost_basis_cents)} ·{" "}
                    {returnPercent(h.current_value_cents, h.cost_basis_cents)}
                  </span>
                  {own && <SellButton id={h.id} />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
