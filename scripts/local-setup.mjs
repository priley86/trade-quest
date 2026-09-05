import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";

// Local development only. Never use this script against a hosted database.
const raw = execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const status = JSON.parse(raw);
const api = status.API_URL;
if (!api || !["127.0.0.1", "localhost"].includes(new URL(api).hostname)) throw new Error("This setup script only supports local Supabase.");
const anon = status.ANON_KEY;
const service = status.SERVICE_ROLE_KEY;
if (!anon || !service) throw new Error("Local Supabase keys are unavailable. Run npm run local:supabase first.");
const env = [
  `NEXT_PUBLIC_SUPABASE_URL=${api}`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
  `SUPABASE_SERVICE_ROLE_KEY=${service}`, "DOLT_DATABASE_URL=mysql://root@127.0.0.1:3307/tradequest",
  "DOLTHUB_DATABASE=priley86/trade-quest", "DOLTHUB_BRANCH=main", "DOLTHUB_API_TOKEN=", "",
].join("\n");
try {
  const existing = await readFile(".env.local", "utf8");
  const existingUrl = existing.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
  if (existingUrl && !["localhost", "127.0.0.1"].includes(new URL(existingUrl).hostname)) throw new Error("Refusing to overwrite hosted .env.local settings.");
} catch (error) { if (error.code !== "ENOENT") throw error; }
await writeFile(".env.local", env, { mode: 0o600 });

const connection = await mysql.createConnection({ host: "127.0.0.1", port: 3307, user: "root", multipleStatements: true });
await connection.query("CREATE DATABASE IF NOT EXISTS tradequest");
await connection.query("USE tradequest");
await connection.query(await readFile("dolt/schema.sql", "utf8"));
const db = createClient(api, service, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "admin@tradequest.local";
const password = "TradeQuestLocal1!";
const { data: listed, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
let user = listed.users.find(u => u.email === email);
if (!user) {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
}
const { data: existingProfile, error: profileError } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
if (profileError) throw profileError;
let profile = existingProfile;
if (!profile) {
  const { data, error } = await db.from("profiles").insert({ id: user.id, first_name: "Crew", last_name: "Leader", role: "admin" }).select("*").single();
  if (error) throw error;
  profile = data;
}
const { data: existingCrew, error: crewError } = await db.from("crews").select("*").eq("public_code", "PINE-742").maybeSingle();
if (crewError) throw crewError;
let crew = existingCrew;
if (!crew) {
  const { data, error } = await db.from("crews").insert({ public_code: "PINE-742", name: "Pine Ridge Explorers", welcome_greeting: "Welcome, adventurers! Let’s learn, trade, and grow together.", created_by: user.id }).select("*").single();
  if (error) throw error;
  crew = data;
}
for (const result of [
  await db.from("crew_members").upsert({ crew_id: crew.id, user_id: user.id }, { onConflict: "crew_id,user_id", ignoreDuplicates: true }),
  await db.from("ledger_enrollments").upsert({ user_id: user.id, player_id: profile.public_player_id, crew_public_id: crew.public_code, display_name: profile.display_name, starting_balance_cents: 100000 }, { onConflict: "user_id", ignoreDuplicates: true }),
]) { if (result.error) throw result.error; }
await connection.execute("INSERT IGNORE INTO player_accounts (player_id,crew_public_id,display_name,cash_cents) VALUES (?,?,?,100000)", [profile.public_player_id, crew.public_code, profile.display_name]);
await connection.end();
const code = randomBytes(32).toString("base64url");
const { error: inviteError } = await db.from("invitations").insert({ code_hash: createHash("sha256").update(code).digest("hex"), crew_id: crew.id, created_by: user.id, max_uses: 20, expires_at: new Date(Date.now() + 14 * 86400000).toISOString() });
if (inviteError) throw inviteError;
await mkdir(".local", { recursive: true });
await writeFile(".local/welcome.txt", `Local admin: ${email}\nPassword: ${password}\nInvitation: http://localhost:3000/invite/${code}\n`, { mode: 0o600 });
console.log("Local setup ready. Run npm run dev.");
console.log(`Admin: ${email} / ${password}`);
console.log(`Local invitation: http://localhost:3000/invite/${code}`);
console.log("Local credentials and invitation are saved in .local/welcome.txt (ignored by Git).");
