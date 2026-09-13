"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "../../lib/auth";
import { serviceClient } from "../../lib/supabase/server";
import {
  contactIdentity,
  passwordValue,
  requiredText,
} from "../../lib/validation";

export type ProfileState = {
  message?: string;
  success?: boolean;
  favoriteColor?: string;
};
export async function updateProfile(
  _state: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const { user, supabase } = await requirePlayer();
  try {
    const firstName = requiredText(form.get("firstName"), "First name");
    const lastName = requiredText(form.get("lastName"), "Last name");
    const favoriteColor = [
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
    ].includes(String(form.get("favoriteColor")))
      ? String(form.get("favoriteColor"))
      : "blue";
    const contact = contactIdentity(form.get("contact"));
    const password = String(form.get("password") || "");
    const profileUpdate = await serviceClient()
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        favorite_color: favoriteColor,
      })
      .eq("id", user.id);
    if (profileUpdate.error)
      return { message: "Couldn’t update your name. Please try again." };
    const authUpdate = await supabase.auth.updateUser({
      ...contact,
      ...(password ? { password: passwordValue(password) } : {}),
    });
    if (authUpdate.error) return { message: authUpdate.error.message };
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    return {
      success: true,
      favoriteColor,
      message:
        "Your profile was updated." +
        (authUpdate.data.user?.email !== user.email
          ? " Check your new email for a confirmation link."
          : ""),
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Couldn’t update your profile.",
    };
  }
}
