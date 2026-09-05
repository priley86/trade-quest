"use client";
import { useActionState, useState } from "react";
import { saveCrew, createInvitation, revokeInvitation, changeRole, deleteUser } from "./actions";
import type { Crew, Profile } from "../../lib/auth";
export function CrewForm({ crew }: { crew?: Crew }) {
  const [state, action, pending] = useActionState(saveCrew, {});
  return <form action={action} className="stack-form">
    {crew && <input type="hidden" name="id" value={crew.id} />}
    <label>Crew name<input name="name" required maxLength={80} defaultValue={crew?.name} placeholder="Pine Ridge Explorers" /></label>
    <label>Welcome greeting<textarea name="welcome" required maxLength={500} defaultValue={crew?.welcome_greeting || "Welcome, explorers! Let’s learn and grow together."} /></label>
    <label>Crew logo URL<input name="logo" type="url" placeholder="https://…" defaultValue={crew?.logo_url || ""} /></label>
    <p>Each new player starts with $1,000 in pretend money.</p>
    <button className="primary-button" disabled={pending}>{pending ? "Saving…" : crew ? "Save crew" : "Create crew"}</button>
    {state.message && <p role="status" className="form-status">{state.message}</p>}
  </form>;
}
export function InvitationForm({ crews }: { crews: Crew[] }) {
  const [state, action, pending] = useActionState(createInvitation, {});
  const [copied, setCopied] = useState("");
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(state.invitePath!, window.location.origin).href); setCopied("Copied!"); }
    catch { setCopied("Select the invitation link and copy it from the browser."); }
  }
  return <form action={action} className="stack-form">
    <label>Crew<select name="crew" required defaultValue=""><option value="" disabled>Select a crew</option>{crews.map(c => <option key={c.id} value={c.id}>{c.name} · {c.public_code}</option>)}</select></label>
    <div className="two-fields"><label>Expires in days<input name="days" type="number" min={1} max={90} defaultValue={14} required /></label><label>Players allowed<input name="uses" type="number" min={1} max={100} defaultValue={1} required /></label></div>
    <button className="primary-button" disabled={pending || !crews.length}>{pending ? "Creating…" : "Create invitation"}</button>
    {state.message && <p role="status" className="form-status">{state.message}</p>}
    {state.invitePath && <div className="invite-result"><a href={state.invitePath} target="_blank" rel="noreferrer">Open invitation</a><button className="text-button" type="button" onClick={copyLink}>Copy invitation link</button><p role="status">{copied}</p></div>}
  </form>;
}
export function RevokeForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeInvitation, {});
  return <form action={action}><input type="hidden" name="id" value={id} /><button className="text-button" disabled={pending}>Revoke invitation</button>{state.message && <p role="status">{state.message}</p>}</form>;
}
export function UserControls({ profile, self }: { profile: Profile; self: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState(changeRole, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteUser, {});
  if (self) return <p>Your account · Ask another admin to change your role.</p>;
  return <div className="user-controls"><form action={roleAction}>
    <input type="hidden" name="id" value={profile.id} /><input type="hidden" name="role" value={profile.role === "admin" ? "player" : "admin"} />
    <button className="text-button" disabled={rolePending}>{profile.role === "admin" ? "Remove admin access" : "Make admin"}</button>
    {roleState.message && <p role="status">{roleState.message}</p>}
  </form>{profile.role === "player" && <details><summary>Delete account</summary><form action={deleteAction} className="stack-form"><input type="hidden" name="id" value={profile.id} />
    <p>Permanently removes this player’s login, private profile, and crew membership. Anonymous public game history remains on DoltHub.</p>
    <label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autoComplete="off" /></label><button className="danger-button" disabled={deletePending}>{deletePending ? "Deleting…" : "Permanently delete account"}</button>
    {deleteState.message && <p role="status">{deleteState.message}</p>}</form></details>}</div>;
}
