import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const statements = [
  "ALTER TABLE holdings ADD COLUMN sold_at timestamp NULL",
  "ALTER TABLE holdings ADD COLUMN sale_value_cents bigint NULL",
];
if (!apply) {
  for (const sql of statements) console.log(`[dry-run] ${sql};`);
  process.exit(0);
}
const db = await mysql.createConnection({
  uri: process.env.DOLT_DATABASE_URL || "mysql://root@127.0.0.1:3307/tradequest",
});
for (const sql of statements) {
  try {
    await db.query(sql);
    console.log(`[applied] ${sql}`);
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") console.log(`[already-present] ${sql}`);
    else throw error;
  }
}
await db.end();
