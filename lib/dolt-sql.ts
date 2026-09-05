// Only server code executes these queries. UTF-8 hex literals avoid interpolating
// user-provided text into SQL quoting rules (including NO_BACKSLASH_ESCAPES).
import { uuid } from "./validation.ts";
export function sqlText(value: string): string {
  return `CONVERT(X'${Buffer.from(value, "utf8").toString("hex")}' USING utf8mb4)`;
}
export type Enrollment = { player_id: string; crew_public_id: string; display_name: string; starting_balance_cents: number | string };
export function enrollmentQuery(enrollment: Enrollment): string {
  const id = uuid(enrollment.player_id);
  const cents = Number(enrollment.starting_balance_cents);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid starting balance.");
  return `INSERT IGNORE INTO player_accounts (player_id,crew_public_id,display_name,cash_cents) VALUES (${sqlText(id)},${sqlText(enrollment.crew_public_id)},${sqlText(enrollment.display_name)},${cents})`;
}
