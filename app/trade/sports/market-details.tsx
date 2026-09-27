import { getSportsProduct, type SportsProduct } from "../../../lib/cardsight";
import { money } from "../../../lib/validation";
import { HistoryChart } from "../../portfolio/history-chart";

export async function SportsMarketDetails({
  id,
  sport,
}: {
  id: string;
  sport?: string;
}) {
  const product = await getSportsProduct(id, sport || "");
  if (!product) {
    return <p>CardSight market data is unavailable right now.</p>;
  }
  return <SportsMarketSnapshot product={product} />;
}

export function SportsMarketSnapshot({ product }: { product: SportsProduct }) {
  return (
    <>
      <h2>Card details</h2>
      <dl className="snapshot-grid">
        <div><dt>Year</dt><dd>{product.year || "—"}</dd></div>
        <div><dt>Manufacturer</dt><dd>{product.manufacturerName || "—"}</dd></div>
        <div><dt>Release</dt><dd>{product.releaseName || "—"}</dd></div>
        <div><dt>Set</dt><dd>{product.setName || "—"}</dd></div>
        <div><dt>Card number</dt><dd>{product.cardNumber || "—"}</dd></div>
      </dl>
      <h2>CardSight market data</h2>
      <p>Current value is derived from the average of the 10 most recent sales.</p>
      <dl className="snapshot-grid">
        <div><dt>Market price</dt><dd>{money(product.marketPriceCents)}</dd></div>
        <div><dt>Low sale price</dt><dd>{money(product.lowCents)}</dd></div>
        <div><dt>Mid sale price</dt><dd>{money(product.midCents)}</dd></div>
        <div><dt>High sale price</dt><dd>{money(product.highCents)}</dd></div>
      </dl>
      {product.history && product.history.length > 1 && (
        <section className="detail-history-chart">
          <h3>1-year price history (average weekly sales price)</h3>
          <HistoryChart values={product.history} />
        </section>
      )}
      {product.recentRecords?.length ? (
        <>
          <h3 className="recent-sales-heading">10 most recent sales</h3>
          <table>
            <thead><tr><th>Title</th><th>Price</th><th>Date</th><th>Source</th></tr></thead>
            <tbody>
              {product.recentRecords.map((record, index) => (
                <tr key={`${record.date}-${index}`}>
                  <td>{record.title}</td>
                  <td>{money(Math.round(record.price * 100))}</td>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>{record.url ? <a className="text-link" href={record.url} target="_blank" rel="noreferrer">LINK</a> : record.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
}
