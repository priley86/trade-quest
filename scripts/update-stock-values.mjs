import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
try {
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = l.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const db = await mysql.createConnection({
    uri:
      process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest",
  }),
  h = {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY || "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET || "",
  };
async function treasuryYield() {
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${month}`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`Treasury API HTTP ${response.status}`);
  const xml = await response.text();
  const values = [...xml.matchAll(/<[^>]*BC_1MONTH[^>]*>([^<]+)</g)]
    .map((m) => Number(m[1]))
    .filter(Number.isFinite);
  const value = values.at(-1);
  if (value === undefined) throw Error("no 1-month Treasury yield");
  return value / 100;
}
const [rows] = await db.query(
  "select id,asset_public_id,quantity,current_value_cents,cost_basis_cents,acquired_at from holdings where asset_type='stock'",
);
console.log(`[stock-values] found ${rows.length} holding(s)`);
for (const x of rows) {
  try {
    if (x.asset_public_id === "TREASURY") {
      const rate = await treasuryYield();
      const [[last]] = await db.query(
        "select recorded_date,market_value_cents from holding_price_history where holding_id=? order by recorded_date desc limit 1",
        [x.id],
      );
      const startDate = last?.recorded_date
        ? new Date(last.recorded_date)
        : new Date(x.acquired_at);
      const today = new Date();
      const days = Math.max(
        0,
        Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) / 86400000),
      );
      const current = Number(last?.market_value_cents ?? x.cost_basis_cents);
      const c = Math.round(current * (1 + rate / 365) ** days);
      await db.query("update holdings set current_value_cents=? where id=?", [c, x.id]);
      await db.query(
        "insert into holding_price_history(holding_id,recorded_date,market_value_cents,source,card_api_id) values(?,current_date,?,'treasury',?) on duplicate key update market_value_cents=values(market_value_cents)",
        [x.id, c, "TREASURY"],
      );
      console.log(`[stock-values] UPDATED ${x.id} -> $${(c / 100).toFixed(2)} at ${(rate * 100).toFixed(2)}% for ${days} day(s)`);
      continue;
    }
    const r = await fetch(
      `https://data.alpaca.markets/v2/stocks/${x.asset_public_id}/snapshot?feed=iex`,
      { headers: h },
    );
    if (!r.ok) throw Error(`API HTTP ${r.status}`);
    const j = await r.json(),
      c = Math.round(
        Number(j.latestTrade?.p || j.dailyBar?.c || 0) *
          100 *
          Number(x.quantity),
      );
    if (!c) throw Error("no price");
    await db.query("update holdings set current_value_cents=? where id=?", [
      c,
      x.id,
    ]);
    await db.query(
      "insert into holding_price_history(holding_id,recorded_date,market_value_cents,source,card_api_id) values(?,current_date,?,'alpaca',?) on duplicate key update market_value_cents=values(market_value_cents)",
      [x.id, c, x.asset_public_id],
    );
    console.log(`[stock-values] UPDATED ${x.id} -> $${(c / 100).toFixed(2)}`);
  } catch (e) {
    console.error(`[stock-values] FAILED ${x.id}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 350));
}
await db.end();
