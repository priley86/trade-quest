import "server-only";
import { enrollmentQuery, sqlText, type Enrollment } from "./dolt-sql";
import { uuid } from "./validation";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

const local = globalThis as typeof globalThis & { tradequestDolt?: Pool };
function localPool(): Pool | null {
  const url = process.env.DOLT_DATABASE_URL;
  if (!url) return null;
  local.tradequestDolt ??= mysql.createPool({ uri: url, connectionLimit: 5, connectTimeout: 5000 });
  return local.tradequestDolt;
}

export type Holding = { id: string; asset_type: "stock" | "pokemon_card" | "sports_card"; display_name: string; quantity: number; cost_basis_cents: number; current_value_cents: number };
export type Snapshot = { snapshot_date: string; total_value_cents: number };
export type Portfolio = { player_id: string; display_name: string; crew_public_id: string; cash_cents: number; holdings: Holding[]; snapshots: Snapshot[] };
export type Leader = { player_id: string; display_name: string; cash_cents: number; total_value_cents: number };
function endpoint() {
  const database = process.env.DOLTHUB_DATABASE;
  if (!database || !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(database)) throw new Error("The game ledger is not connected yet.");
  return `https://www.dolthub.com/api/v1alpha1/${database}`;
}
function branch() { return encodeURIComponent(process.env.DOLTHUB_BRANCH || "main"); }
export async function readQuery<T>(query: string): Promise<T[]> {
  const pool = localPool();
  if (pool) {
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows as T[];
  }
  const url = new URL(`${endpoint()}/${branch()}`);
  url.searchParams.set("q", query);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("The game ledger is temporarily unavailable.");
  const result = await response.json();
  if (result.query_execution_status !== "Success" || !Array.isArray(result.rows)) {
    throw new Error("The game ledger could not return a complete result. Ask your crew leader to check setup.");
  }
  return result.rows;
}
export async function portfolio(playerId: string): Promise<Portfolio | null> {
  const id = sqlText(uuid(playerId));
  const accounts = await readQuery<Omit<Portfolio, "holdings" | "snapshots">>(`SELECT player_id,display_name,crew_public_id,cash_cents FROM player_accounts WHERE player_id=${id}`);
  if (!accounts[0]) return null;
  const [holdings, snapshots] = await Promise.all([
    readQuery<Holding>(`SELECT id,asset_type,display_name,quantity,cost_basis_cents,current_value_cents FROM holdings WHERE player_id=${id} ORDER BY display_name LIMIT 500`),
    readQuery<Snapshot>(`SELECT snapshot_date,total_value_cents FROM portfolio_snapshots WHERE player_id=${id} ORDER BY snapshot_date DESC LIMIT 90`),
  ]);
  return { ...accounts[0], cash_cents: Number(accounts[0].cash_cents),
    holdings: holdings.map(h => ({ ...h, quantity: Number(h.quantity), cost_basis_cents: Number(h.cost_basis_cents), current_value_cents: Number(h.current_value_cents) })),
    snapshots: snapshots.reverse().map(s => ({ ...s, total_value_cents: Number(s.total_value_cents) })) };
}
export async function leaderboard(crewId: string): Promise<Leader[]> {
  const rows = await readQuery<Leader>(`SELECT p.player_id,p.display_name,p.cash_cents,p.cash_cents+COALESCE(SUM(h.current_value_cents),0) AS total_value_cents FROM player_accounts p LEFT JOIN holdings h ON h.player_id=p.player_id WHERE p.crew_public_id=${sqlText(crewId)} GROUP BY p.player_id,p.display_name,p.cash_cents ORDER BY total_value_cents DESC,p.player_id LIMIT 500`);
  return rows.map(r => ({ ...r, cash_cents: Number(r.cash_cents), total_value_cents: Number(r.total_value_cents) }));
}
export async function provisionPortfolio(enrollment: Enrollment) {
  const pool = localPool();
  if (pool) {
    await pool.query(enrollmentQuery(enrollment));
    return;
  }
  const token = process.env.DOLTHUB_API_TOKEN;
  if (!token) throw new Error("Your crew leader still needs to connect the game ledger.");
  const headers = { authorization: `token ${token}`, "Content-Type": "application/json" };
  const response = await fetch(`${endpoint()}/write/${branch()}/${branch()}`, {
    method: "POST", headers, body: JSON.stringify({ query: enrollmentQuery(enrollment) }),
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Couldn’t open your portfolio yet. Please try again.");
  const result = await response.json();
  if (result.query_execution_status !== "Success" || !result.operation_name) throw new Error("Couldn’t open your portfolio yet. Please try again.");
  const url = new URL(`${endpoint()}/write`);
  url.searchParams.set("operationName", result.operation_name);
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const poll = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!poll.ok) break;
    const operation = await poll.json();
    if (operation.done) {
      if (operation.res_details?.query_execution_status !== "Success") throw new Error("Portfolio setup needs another try. Your starting money will only be added once.");
      return;
    }
  }
  throw new Error("Your portfolio is still being prepared. Wait a moment, then refresh or try again. Your starting money will only be added once.");
}
