"use server";
import { redirect } from "next/navigation";
import { serverClient } from "../../lib/supabase/server";
import { contactIdentity, passwordValue, requiredText } from "../../lib/validation";
import { findInvitation } from "../../lib/invitations";

export type AuthState = { message?: string; phone?: string; confirmation?: boolean };
export async function signup(_previous: AuthState, form: FormData): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("contact"));
    const password = passwordValue(form.get("password"));
    const firstName = requiredText(form.get("firstName"), "First name");
    const lastName = requiredText(form.get("lastName"), "Last name");
    const code = requiredText(form.get("code"), "Invitation code", 128);
    if (!await findInvitation(code)) return { message: "This invitation is expired or already used. Ask your crew leader for a new one." };
    const supabase = await serverClient();
    const { data, error } = await supabase.auth.signUp({ ...identity, password,
      options: { data: { first_name: firstName, last_name: lastName, invite_code: code } } });
    if (error) return { message: error.code === "unexpected_failure"
      ? "We could not accept this invitation. Ask your crew leader for a fresh link, or try logging in if you already registered." : error.message };
    if (!data.session) return { confirmation: true, phone: "phone" in identity ? identity.phone : undefined,
      message: "phone" in identity ? "Enter the code from your text message to finish joining."
        : "Check your email to confirm your account, then log in. If you already have an account, use Log in below." };
  } catch (error) { return { message: error instanceof Error ? error.message : "We couldn’t create your account. Please try again." }; }
  redirect("/");
}
export async function login(_previous: AuthState, form: FormData): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("contact"));
    const password = form.get("password");
    if (typeof password !== "string" || !password || password.length > 128) throw new Error("Enter your password.");
    const supabase = await serverClient();
    const { error } = await supabase.auth.signInWithPassword({ ...identity, password });
    if (error) return { message: "We couldn’t log you in. Check your email or phone, password, and account confirmation." };
  } catch (error) { return { message: error instanceof Error ? error.message : "Login is temporarily unavailable." }; }
  redirect("/");
}
export async function verifyPhone(_previous: AuthState, form: FormData): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("phone"));
    if (!("phone" in identity)) throw new Error("Enter a phone number.");
    const token = requiredText(form.get("token"), "Confirmation code", 10);
    const supabase = await serverClient();
    const { error } = await supabase.auth.verifyOtp({ phone: identity.phone, token, type: "sms" });
    if (error) return { message: "That code is invalid or expired. Try the latest code or request another." };
  } catch (error) { return { message: error instanceof Error ? error.message : "Couldn’t confirm your phone." }; }
  redirect("/");
}
export async function resendPhone(_previous: AuthState, form: FormData): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("phone"));
    if (!("phone" in identity)) throw new Error("Enter a phone number.");
    const supabase = await serverClient();
    const { error } = await supabase.auth.resend({ type: "sms", phone: identity.phone });
    return { message: error ? "Couldn’t resend yet. Wait a minute and try again." : "A new code is on its way." };
  } catch (error) { return { message: error instanceof Error ? error.message : "Couldn’t resend the code." }; }
}
export async function logout() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect("/login");
}
