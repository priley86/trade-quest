import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";

try { for (const line of readFileSync(".env.local", "utf8").split("\n")) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]]=m[2]; } } catch {}

const base = "https://api.cardsight.ai";
const headers = process.env.CARDSIGHT_API_KEY ? { Authorization: `Bearer ${process.env.CARDSIGHT_API_KEY}`, "X-Api-Key": process.env.CARDSIGHT_API_KEY } : {};
const db = await mysql.createConnection({ uri: process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest" });
console.log(`[sports-values] started ${new Date().toISOString()}`);
await db.query("CREATE TABLE IF NOT EXISTS holding_price_history (id bigint auto_increment primary key, holding_id varchar(36) not null, recorded_date date not null, market_value_cents bigint not null, source varchar(40) not null, card_api_id varchar(120) not null, unique key uq_holding_day (holding_id, recorded_date))");
const [holdings] = await db.query("SELECT id,asset_public_id FROM holdings WHERE asset_type='sports_card'");
console.log(`[sports-values] found ${holdings.length} sports holding(s)`);
let updated=0, failed=0, skipped=0;
for (let start=0; start<holdings.length; start+=10) {
  const batch=holdings.slice(start,start+10);
  for (const h of batch) {
    try {
      const r=await fetch(`${base}/v1/pricing/${encodeURIComponent(h.asset_public_id)}`,{headers});
      if(!r.ok) throw new Error(`API HTTP ${r.status}`);
      const j=await r.json();
      const records=(j?.raw?.records||[]).filter(x=>Number.isFinite(Number(x.price))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
      if(!records.length){console.warn(`[sports-values] SKIPPED ${h.id} (${h.asset_public_id}): no raw records`);skipped++;continue;}
      const cents=Math.round(records.reduce((s,x)=>s+Number(x.price),0)/records.length*100);
      await db.query("UPDATE holdings SET current_value_cents=? WHERE id=?",[cents,h.id]);
      await db.query("INSERT INTO holding_price_history (holding_id,recorded_date,market_value_cents,source,card_api_id) VALUES (?,CURRENT_DATE,?,'cardsight-10-sales',?) ON DUPLICATE KEY UPDATE market_value_cents=VALUES(market_value_cents)",[h.id,cents,h.asset_public_id]);
      console.log(`[sports-values] UPDATED ${h.id} (${h.asset_public_id}) -> $${(cents/100).toFixed(2)}`);updated++;
    } catch(e) { console.error(`[sports-values] FAILED ${h.id} (${h.asset_public_id}): ${e.message}`);failed++; }
    await new Promise(resolve=>setTimeout(resolve,350));
  }
}
const [accounts]=await db.query("SELECT player_id,cash_cents FROM player_accounts"); for(const a of accounts){const [v]=await db.query("SELECT COALESCE(SUM(current_value_cents),0) total FROM holdings WHERE player_id=?",[a.player_id]);const total=Number(a.cash_cents)+Number(v[0].total);await db.query("INSERT INTO portfolio_snapshots (player_id,snapshot_date,cash_cents,holdings_value_cents,total_value_cents) VALUES (?,CURRENT_DATE,?,?,?) ON DUPLICATE KEY UPDATE cash_cents=VALUES(cash_cents),holdings_value_cents=VALUES(holdings_value_cents),total_value_cents=VALUES(total_value_cents)",[a.player_id,a.cash_cents,v[0].total,total]);}
console.log(`[sports-values] complete: updated=${updated} skipped=${skipped} failed=${failed}`); await db.end(); if(failed) process.exitCode=1;
