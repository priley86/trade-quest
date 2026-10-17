import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  uri: process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest",
});
const today = new Date().toISOString().slice(0, 10);
const [accounts] = await db.query("SELECT player_id,cash_cents FROM player_accounts");
for (const account of accounts) {
  const [[value]] = await db.query(
    "SELECT COALESCE(SUM(current_value_cents),0) AS holdings_value_cents FROM holdings WHERE player_id=? AND sold_at IS NULL",
    [account.player_id],
  );
  const cash = Number(account.cash_cents);
  const holdings = Number(value.holdings_value_cents);
  const total = cash + holdings;
  await db.query(
    "INSERT INTO portfolio_snapshots (player_id,snapshot_date,cash_cents,holdings_value_cents,total_value_cents) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE cash_cents=VALUES(cash_cents),holdings_value_cents=VALUES(holdings_value_cents),total_value_cents=VALUES(total_value_cents)",
    [account.player_id, today, cash, holdings, total],
  );
  console.log(`[portfolio-snapshot] ${account.player_id} ${today} -> $${(total / 100).toFixed(2)}`);
}
await db.end();
