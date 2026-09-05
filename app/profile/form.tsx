"use client";
import { useActionState } from "react";
import { updateProfile } from "./actions";
export function ProfileForm({ firstName, lastName, contact }: { firstName: string; lastName: string; contact: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return <form action={action} className="stack-form">
    <label>Username (email or phone)<input name="contact" defaultValue={contact} required maxLength={254} autoComplete="username" /></label>
    <div className="two-fields"><label>First name<input name="firstName" defaultValue={firstName} required maxLength={80} autoComplete="given-name" /></label><label>Last name<input name="lastName" defaultValue={lastName} required maxLength={80} autoComplete="family-name" /></label></div>
    <label>New password<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Leave blank to keep your current password" /></label>
    <button className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    {state.message && <p className="form-status" role="status">{state.message}</p>}
  </form>;
}
