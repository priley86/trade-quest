import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlayer } from "../../../lib/auth";
import { portfolio, readQuery } from "../../../lib/dolt";
import { AppShell } from "../../ui";
import { money, returnPercent } from "../../../lib/validation";
import { HistoryChart } from "../history-chart";
import { SportsMarketDetails } from "../../trade/sports/market-details";
import { getOneMonthTreasuryYield, treasuryReturns } from "../../../lib/alpaca";
import { getStockValueCents } from "../../../lib/alpaca";
export default async function HoldingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requirePlayer();
  const { id } = await params;
  const data = await portfolio(profile.public_player_id);
  const h = data?.holdings.find((x) => x.id === id);
  if (!data || !h) notFound();
  let liveValueCents = h.current_value_cents;
  if (h.asset_type === "stock" && h.asset_public_id && h.asset_public_id !== "TREASURY") {
    try {
      liveValueCents = await getStockValueCents(h.asset_public_id, h.quantity);
    } catch {
      // Keep the last assessed value if the quote service is unavailable.
    }
  }
  const history = await readQuery<{
    recorded_date: string;
    market_value_cents: number;
  }>(
    `SELECT recorded_date,market_value_cents FROM holding_price_history WHERE holding_id='${id}' ORDER BY recorded_date DESC`,
  );
  const chartValues = [
    {
      date: h.acquired_at
        ? String(h.acquired_at).slice(0, 10)
        : String(history[history.length - 1]?.recorded_date ?? ""),
      cents: h.cost_basis_cents,
    },
    ...[...history].reverse().map((p: any) => ({
      date: String(p.recorded_date).slice(0, 10),
      cents: Number(p.market_value_cents),
    })),
  ];
  return (
    <AppShell active="portfolio" profile={profile}>
      <Link className="text-link" href="/">
        ← Back to collection
      </Link>
      <section className="pokemon-detail">
        <div className="detail-art">
          {h.image_url ? (
            <img src={h.image_url} alt="" />
          ) : (
            <div
              className={`category-icon ${h.asset_type === "stock" ? "stock" : h.asset_type === "sports_card" ? "sports" : "pokemon"} ${h.asset_public_id === "TREASURY" ? "treasury" : ""} large`}
            >
              {h.asset_public_id === "TREASURY" ? "＄" : h.asset_type === "stock"
                ? "📈"
                : h.asset_type === "sports_card"
                  ? "⚾"
                  : "◉"}
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">Your collection</span>
          <h1>{h.display_name}</h1>
          <p className={`detail-price `}>{money(liveValueCents)}</p>
          <p>
            Current value ·{" "}
            <span
              className={
                liveValueCents >= h.cost_basis_cents
                  ? "positive"
                  : "negative"
              }
            >
              {returnPercent(liveValueCents, h.cost_basis_cents)}
            </span>{" "}
            since purchase
          </p>
        </div>
        <div className="price-history">
          <h2>Holding details</h2>
          <dl className="snapshot-grid">
            <div>
              <dt>Quantity</dt>
              <dd>{h.quantity}</dd>
            </div>
            <div>
              <dt>Purchase price</dt>
              <dd>{money(h.cost_basis_cents)}</dd>
            </div>
            <div>
              <dt>Current value</dt>
              <dd>{money(liveValueCents)}</dd>
            </div>
          </dl>
          {h.asset_public_id === "TREASURY" ? (
            <a className="text-link" href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" target="_blank" rel="noreferrer">U.S. Treasury daily rates ↗</a>
          ) : h.product_url && h.asset_type !== "sports_card" && (
            <a
              className="text-link"
              href={h.product_url}
              target="_blank"
              rel="noreferrer"
            >
              {h.asset_type === "stock"
                ? "Yahoo Stock Info"
                : "Review card source"}{" "}
              ↗
            </a>
          )}
          {h.asset_public_id === "TREASURY" && <TreasuryReturnSnapshot />}
          {h.asset_type === "sports_card" && h.asset_public_id && (
            <SportsMarketDetails id={h.asset_public_id} sport={h.sport_segment} />
          )}
        </div>
      </section>
      <section className="chart-card">
        <h2>Recorded value history</h2>
        {chartValues.length > 1 && <HistoryChart values={chartValues} />}
        {history.length ? (
          <ul>
            {history.map((point: any) => (
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

async function TreasuryReturnSnapshot() {
  const yieldPercent = await getOneMonthTreasuryYield();
  const returns = treasuryReturns(yieldPercent);
  return <dl className="snapshot-grid"><div><dt>Projected daily return</dt><dd className="positive">+{(returns.daily * 100).toFixed(3)}%</dd></div><div><dt>Projected 1-month return</dt><dd className="positive">+{(returns.monthly * 100).toFixed(2)}%</dd></div><div><dt>Projected 1-year return</dt><dd className="positive">+{(returns.yearly * 100).toFixed(2)}%</dd></div></dl>;
}
