"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/auth";
import { serviceClient } from "../../lib/supabase/server";
import { logoUrl, positiveInteger, requiredText, uuid } from "../../lib/validation";
export type AdminState = { message?: string; invitePath?: string; success?: boolean };
function failure(error: unknown): AdminState {
  return { message: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}
export async function saveCrew(_state: AdminState, form: FormData): Promise<AdminState> {
  const { user, supabase } = await requireAdmin();
  try {
    const values = { name: requiredText(form.get("name"), "Crew name"), welcome_greeting: requiredText(form.get("welcome"), "Welcome greeting", 500), logo_url: logoUrl(form.get("logo")) };
    const id = form.get("id");
    const result = id ? await supabase.from("crews").update(values).eq("id", uuid(id)).select("id").single()
      : await supabase.from("crews").insert({ ...values, public_code: `CREW-${randomBytes(6).toString("hex").toUpperCase()}`, created_by: user.id, starting_balance_cents: 100000 }).select("id").single();
    if (result.error) return { message: "Couldn’t save the crew. Please try again." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: id ? "Crew updated." : "Crew created! Make an invitation below to welcome your explorers." };
  } catch (error) { return failure(error); }
}
export async function createInvitation(_state: AdminState, form: FormData): Promise<AdminState> {
  const { user, supabase } = await requireAdmin();
  try {
    const crewId = uuid(form.get("crew"));
    const days = positiveInteger(form.get("days"), 90);
    const uses = positiveInteger(form.get("uses"), 100);
    const code = randomBytes(32).toString("base64url");
    const { error } = await supabase.from("invitations").insert({ crew_id: crewId, created_by: user.id,
      code_hash: createHash("sha256").update(code).digest("hex"), expires_at: new Date(Date.now() + days * 86400000).toISOString(), max_uses: uses });
    if (error) return { message: "Couldn’t create the invitation. Select an existing crew and try again." };
    revalidatePath("/admin");
    return { success: true, message: "Invitation ready. Copy this link now; it won’t be shown again after leaving this page.", invitePath: `/invite/${code}` };
  } catch (error) { return failure(error); }
}
export async function revokeInvitation(_state: AdminState, form: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  try {
    const { error } = await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", uuid(form.get("id"))).select("id").single();
    if (error) return { message: "Couldn’t revoke this invitation." };
    revalidatePath("/admin");
    return { success: true, message: "Invitation revoked." };
  } catch (error) { return failure(error); }
}
export async function changeRole(_state: AdminState, form: FormData): Promise<AdminState> {
  const { user, supabase } = await requireAdmin();
  try {
    const target = uuid(form.get("id"));
    if (target === user.id) throw new Error("You can’t change your own admin role.");
    const role = form.get("role");
    if (role !== "admin" && role !== "player") throw new Error("Choose a valid role.");
    const { error } = await supabase.rpc("set_player_role", { target_user: target, target_role: role });
    if (error) return { message: "Couldn’t change this role. Reload and check your admin access." };
    revalidatePath("/admin");
    return { success: true, message: "Role updated." };
  } catch (error) { return failure(error); }
}
export async function deleteUser(_state: AdminState, form: FormData): Promise<AdminState> {
  const { user } = await requireAdmin();
  try {
    const target = uuid(form.get("id"));
    if (target === user.id) throw new Error("You can’t delete your own account.");
    if (form.get("confirmation") !== "DELETE") throw new Error("Type DELETE to confirm account deletion.");
    // Block promotion and repeat deletion while Auth deletion is in progress.
    const db = serviceClient();
    const viewerClient = (await requireAdmin()).supabase;
    const { error: claimError } = await viewerClient.rpc("claim_player_deletion", { target_user: target });
    if (claimError) return { message: "Couldn’t delete this player. Admins must be demoted first, and accounts already being deleted cannot be selected." };
    const { error } = await db.auth.admin.deleteUser(target);
    if (error) {
      await db.from("profiles").update({ deletion_pending: false }).eq("id", target);
      return { message: "Account deletion failed. Please try again." };
    }
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    return { success: true, message: "Account deleted. Its anonymous public ledger history remains on DoltHub." };
  } catch (error) { return failure(error); }
}
