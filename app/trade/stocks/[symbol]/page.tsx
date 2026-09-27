import { notFound } from "next/navigation";
import { requirePlayer } from "../../../../lib/auth";
import { getStock, treasuryReturns } from "../../../../lib/alpaca";
import { AppShell } from "../../../ui";
import { BackButton } from "../../back-button";
import { HistoryChart } from "../../../portfolio/history-chart";
import { StockBuy } from "../buy";
export default async function StockDetail({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { profile } = await requirePlayer();
  const { symbol } = await params;
  const stock = await getStock(symbol);
  if (!stock) notFound();
  const isTreasury = symbol.toUpperCase() === "TREASURY";
  const bars = stock.bars || [],
    chartBars = bars.filter(
      (_, i, a) => i === 0 || i === a.length - 1 || i % 8 === 0,
    ),
    month = bars[Math.max(0, bars.length - 22)]?.cents || 0,
    year = bars[0]?.cents || 0;
  const referenceUrl =
    isTreasury
      ? `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value=${new Date().toISOString().slice(0, 7).replace("-", "")}`
      : `https://finance.yahoo.com/quote/${stock.symbol}`;
  const pct = (base: number) =>
    base ? ((stock.price * 100 - base) / base) * 100 : 0;
  const treasury = stock.treasuryYield !== undefined ? treasuryReturns(stock.treasuryYield) : null;
  return (
    <AppShell active="trade" profile={profile}>
      <BackButton label="← Back to stocks" />
      <section className="pokemon-detail">
        <div className="detail-art">
          <div className={`category-icon ${isTreasury ? "treasury" : "stock"} large`}>{isTreasury ? "＄" : "📈"}</div>
        </div>
        <div>
          <span className="eyebrow">Alpaca market data</span>
          <h1>{stock.symbol}</h1>
          <p>{stock.name}</p>
          <p className="detail-price">${stock.price.toFixed(2)}</p>
          <p>
            {stock.treasuryYield !== undefined
              ? `Current 1-month Treasury yield: ${stock.treasuryYield.toFixed(2)}%`
              : "Latest market price"}
          </p>
          <StockBuy symbol={stock.symbol} price={stock.price} />
        </div>
        {chartBars.length > 1 && (
          <section className="chart-card detail-history-chart">
            <h2>1-year price history</h2>
            <HistoryChart values={chartBars} />
          </section>
        )}
        <div className="price-history">
          <h2>Recent snapshot</h2>
          <dl className="snapshot-grid">
            <div>
              <dt>Price</dt>
              <dd>${stock.price.toFixed(2)}</dd>
            </div>
            <div>
              <dt>{treasury ? "Projected daily return" : "Daily change"}</dt>
              <dd className="positive">
                {treasury ? `+${(treasury.daily * 100).toFixed(3)}%` : `${stock.change >= 0 ? "+" : ""}$${stock.change.toFixed(2)}`}
              </dd>
            </div>
            <div>
                <dt>{treasury ? "Projected 1-month return" : "1-month change"}</dt>
              <dd className="positive">
                {treasury ? `+${(treasury.monthly * 100).toFixed(2)}%` : `${pct(month) >= 0 ? "+" : ""}${pct(month).toFixed(1)}%`}
              </dd>
            </div>
            <div>
                <dt>{treasury ? "Projected 1-year return" : "1-year change"}</dt>
              <dd className="positive">
                {treasury ? `+${(treasury.yearly * 100).toFixed(2)}%` : `${pct(year) >= 0 ? "+" : ""}${pct(year).toFixed(1)}%`}
              </dd>
            </div>
            {stock.treasuryYield !== undefined && (
              <div>
                <dt>Current annualized rate</dt>
                <dd>{stock.treasuryYield.toFixed(2)}% APY</dd>
              </div>
            )}
          </dl>
        </div>
      </section>
      <p>
        <a
          className="text-link"
          href={referenceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {isTreasury ? "U.S. Treasury daily rates" : "Yahoo Finance"} ↗
        </a>
      </p>
    </AppShell>
  );
}
