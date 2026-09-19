"use server";
import { redirect } from "next/navigation";
import { serverClient } from "../../lib/supabase/server";
import {
  contactIdentity,
  passwordValue,
  requiredText,
} from "../../lib/validation";
import { findInvitation } from "../../lib/invitations";

export type AuthState = {
  message?: string;
  phone?: string;
  confirmation?: boolean;
};
export async function signup(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("contact"));
    const password = passwordValue(form.get("password"));
    const firstName = requiredText(form.get("firstName"), "First name");
    const lastName = requiredText(form.get("lastName"), "Last name");
    const code = requiredText(form.get("code"), "Invitation code", 128);
    if (!(await findInvitation(code)))
      return {
        message:
          "This invitation is expired or already used. Ask your crew leader for a new one.",
      };
    const supabase = await serverClient();
    const { data, error } = await supabase.auth.signUp({
      ...identity,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          invite_code: code,
          favorite_color: String(form.get("favoriteColor") || "blue"),
        },
      },
    });
    if (error)
      return {
        message:
          error.code === "unexpected_failure"
            ? "We could not accept this invitation. Ask your crew leader for a fresh link, or try logging in if you already registered."
            : error.message,
      };
    if (!data.session)
      return {
        message:
          "Your account was created. Log in to continue. If login does not work, ask your crew leader to disable signup confirmations in Supabase Auth.",
      };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "We couldn’t create your account. Please try again.",
    };
  }
  redirect("/");
}
export async function login(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  try {
    const identity = contactIdentity(form.get("contact"));
    const password = form.get("password");
    if (typeof password !== "string" || !password || password.length > 128)
      throw new Error("Enter your password.");
    const supabase = await serverClient();
    const { error } = await supabase.auth.signInWithPassword({
      ...identity,
      password,
    });
    if (error)
      return {
        message:
          "We couldn’t log you in. Check your email or phone, password, and account confirmation.",
      };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Login is temporarily unavailable.",
    };
  }
  redirect("/");
}
export async function logout() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect("/login");
}
