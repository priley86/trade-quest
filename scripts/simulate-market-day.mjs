import mysql from "mysql2/promise";

const date =
  process.env.VALUATION_DATE || new Date().toISOString().slice(0, 10);
const move = Number(process.env.MARKET_MOVE_BPS || 0) / 10000;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(move))
  throw new Error(
    "Use VALUATION_DATE=YYYY-MM-DD and MARKET_MOVE_BPS, e.g. 500 or -300.",
  );
const db = await mysql.createConnection({
  uri:
    process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest",
});
const [holdings] = await db.query(
  "SELECT id,player_id,asset_public_id,current_value_cents FROM holdings",
);
for (const h of holdings) {
  const value = Math.max(
    1,
    Math.round(Number(h.current_value_cents) * (1 + move)),
  );
  await db.query("UPDATE holdings SET current_value_cents=? WHERE id=?", [
    value,
    h.id,
  ]);
  await db.query(
    "INSERT INTO holding_price_history (holding_id,recorded_date,market_value_cents,source,card_api_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE market_value_cents=VALUES(market_value_cents)",
    [h.id, date, value, "simulated", h.asset_public_id],
  );
}
const [accounts] = await db.query(
  "SELECT player_id,cash_cents FROM player_accounts",
);
for (const a of accounts) {
  const [[sum]] = await db.query(
    "SELECT COALESCE(SUM(current_value_cents),0) AS value FROM holdings WHERE player_id=?",
    [a.player_id],
  );
  const value = Number(sum.value);
  await db.query(
    "INSERT INTO portfolio_snapshots (player_id,snapshot_date,cash_cents,holdings_value_cents,total_value_cents) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE cash_cents=VALUES(cash_cents),holdings_value_cents=VALUES(holdings_value_cents),total_value_cents=VALUES(total_value_cents)",
    [a.player_id, date, a.cash_cents, value, Number(a.cash_cents) + value],
  );
}
console.log(
  `[simulation] ${date}: applied ${(move * 100).toFixed(2)}% to ${holdings.length} holding(s)`,
);
await db.end();
