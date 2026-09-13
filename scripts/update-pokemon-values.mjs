import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const api = "https://cardmarket-api-tcg.p.rapidapi.com/cards";
const apiHost = "pokemon-tcg-api.p.rapidapi.com";
const fxResponse = process.env.OPEN_EXCHANGE_RATES_APP_ID
  ? await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(process.env.OPEN_EXCHANGE_RATES_APP_ID)}`,
    )
  : null;
const fxRates = fxResponse?.ok ? ((await fxResponse.json()).rates ?? {}) : {};
function toUsd(value, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || currency.toUpperCase() === "USD")
    return amount;
  const rate = Number(fxRates[currency.toUpperCase()]);
  if (rate > 0) return amount / rate;
  const fallback = { EUR: 1.1, GBP: 1.28, CAD: 0.73, AUD: 0.66 };
  return amount * (fallback[currency.toUpperCase()] ?? 1);
}
const db = await mysql.createConnection({
  uri:
    process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest",
});
console.log(`[pokemon-values] started ${new Date().toISOString()}`);
await db.query(
  "CREATE TABLE IF NOT EXISTS holding_price_history (id bigint auto_increment primary key, holding_id varchar(36) not null, recorded_date date not null, market_value_cents bigint not null, source varchar(40) not null, card_api_id varchar(120) not null, unique key uq_holding_day (holding_id, recorded_date))",
);
const [holdings] = await db.query(
  "SELECT id,asset_public_id FROM holdings WHERE asset_type='pokemon_card'",
);
console.log(`[pokemon-values] found ${holdings.length} Pokémon holding(s)`);
let updated = 0,
  failed = 0,
  skipped = 0;
for (let start = 0; start < holdings.length; start += 20) {
  const batch = holdings.slice(start, start + 20);
  const ids = batch.map((h) => h.asset_public_id).join(",");
  /*
    .map((h) => `id:\"${h.asset_public_id.replace(/\"/g, '\\"')}\"`)
    .join(" OR "); */
  try {
    const r = await fetch(
      `${api}?ids=${encodeURIComponent(ids)}&per_page=100`,
      {
        headers: {
          "x-rapidapi-key": process.env.POKEMON_API_KEY || "",
          "x-rapidapi-host": apiHost,
        },
      },
    );
    if (!r.ok) {
      console.error(
        `[pokemon-values] BATCH FAILED (${batch.length} holdings): API HTTP ${r.status}`,
      );
      failed += batch.length;
      continue;
    }
    const cards = new Map((await r.json()).data.map((c) => [String(c.id), c]));
    for (const h of batch) {
      const c = cards.get(h.asset_public_id),
        p = c && c.prices?.tcg_player?.market_price;
      if (!p) {
        console.warn(
          `[pokemon-values] SKIPPED ${h.id} (${h.asset_public_id}): no market price`,
        );
        skipped++;
        continue;
      }
      const currency = c.prices.tcg_player.currency ?? c.currency ?? "USD";
      const cents = Math.round(toUsd(p, currency) * 100);
      await db.query("UPDATE holdings SET current_value_cents=? WHERE id=?", [
        cents,
        h.id,
      ]);
      await db.query(
        "INSERT INTO holding_price_history (holding_id,recorded_date,market_value_cents,source,card_api_id) VALUES (?,CURRENT_DATE,?,'pokemon-tcg-api',?) ON DUPLICATE KEY UPDATE market_value_cents=VALUES(market_value_cents)",
        [h.id, cents, h.asset_public_id],
      );
      console.log(
        `[pokemon-values] UPDATED ${h.id} (${h.asset_public_id}) -> $${(cents / 100).toFixed(2)}`,
      );
      updated++;
    }
  } catch (e) {
    console.error(`[pokemon-values] BATCH FAILED: ${e.message}`);
    failed += batch.length;
  }
}
const [accounts] = await db.query(
  "SELECT player_id,cash_cents FROM player_accounts",
);
for (const a of accounts) {
  const [v] = await db.query(
    "SELECT COALESCE(SUM(current_value_cents),0) AS total FROM holdings WHERE player_id=?",
    [a.player_id],
  );
  const total = Number(a.cash_cents) + Number(v[0].total);
  await db.query(
    "INSERT INTO portfolio_snapshots (player_id,snapshot_date,cash_cents,holdings_value_cents,total_value_cents) VALUES (?,CURRENT_DATE,?,?,?) ON DUPLICATE KEY UPDATE cash_cents=VALUES(cash_cents),holdings_value_cents=VALUES(holdings_value_cents),total_value_cents=VALUES(total_value_cents)",
    [a.player_id, a.cash_cents, v[0].total, total],
  );
}
console.log(
  `[pokemon-values] complete: updated=${updated} skipped=${skipped} failed=${failed}`,
);
await db.end();
if (failed) process.exitCode = 1;
