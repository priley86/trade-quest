import mysql from "mysql2/promise";

const db=await mysql.createConnection({uri:process.env.DOLT_DATABASE_URL||"mysql://root@127.0.0.1:3307/tradequest"});
const [accounts]=await db.query("SELECT player_id,cash_cents FROM player_accounts");
for(const account of accounts){
  const [dates]=await db.query("SELECT DISTINCT recorded_date AS d FROM holding_price_history UNION SELECT CURRENT_DATE AS d ORDER BY d");
  const [holdings]=await db.query("SELECT id,cost_basis_cents,acquired_at FROM holdings WHERE player_id=?",[account.player_id]);
  for(const row of dates){
    let holdingsValue=0; const day=new Date(row.d);
    for(const h of holdings){
      if(new Date(h.acquired_at)>day && day.toISOString().slice(0,10)<"2026-08-30") continue;
      const [[latest]]=await db.query("SELECT market_value_cents FROM holding_price_history WHERE holding_id=? AND recorded_date<=? ORDER BY recorded_date DESC LIMIT 1",[h.id,row.d]);
      holdingsValue+=Number(latest?.market_value_cents ?? h.cost_basis_cents);
    }
    const cash=day.toISOString().slice(0,10)<"2026-08-30"?100000:Number(account.cash_cents); const total=cash+holdingsValue;
    await db.query("INSERT INTO portfolio_snapshots (player_id,snapshot_date,cash_cents,holdings_value_cents,total_value_cents) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE cash_cents=VALUES(cash_cents),holdings_value_cents=VALUES(holdings_value_cents),total_value_cents=VALUES(total_value_cents)",[account.player_id,row.d,cash,holdingsValue,total]);
    console.log(`[portfolio-values] ${account.player_id} ${new Date(row.d).toISOString().slice(0,10)} -> $${(total/100).toFixed(2)}`);
  }
}
await db.end();
