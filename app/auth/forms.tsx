"use client";
import { useActionState } from "react";
import { login, signup, verifyPhone, resendPhone } from "./actions";

function PhoneConfirmation({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(verifyPhone, {});
  const [resendState, resend, resending] = useActionState(resendPhone, {});
  return <><form action={action}>
    <input type="hidden" name="phone" value={phone} />
    <label>Text message code<input name="token" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} /></label>
    <button className="primary-button" disabled={pending}>{pending ? "Checking…" : "Confirm my phone"}</button>
    {state.message && <p role="status" className="form-status">{state.message}</p>}
  </form><form action={resend}><input type="hidden" name="phone" value={phone} /><button className="text-button" disabled={resending}>Send a new code</button>{resendState.message && <p role="status">{resendState.message}</p>}</form></>;
}
export function SignupForm({ code, disabled = false }: { code: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(signup, {});
  return <>{!state.confirmation && <form action={action}>
    <input type="hidden" name="code" value={code} /><div className="two-fields">
      <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
      <label>Last name<input name="lastName" autoComplete="family-name" required maxLength={80} /></label>
    </div>
    <label>Email<input name="contact" type="email" autoComplete="email" required maxLength={254} placeholder="parent@example.com" /></label>
    <label>Create a password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="At least 8 characters" /></label>
    <button className="primary-button" disabled={pending || disabled}>{pending ? "Joining your crew…" : disabled ? "Preview only" : "Start my adventure →"}</button>
  </form>}{state.message && <p role="status" className="form-status">{state.message}</p>}{state.phone && <PhoneConfirmation phone={state.phone} />}</>;
}
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  return <form action={action}>
    <label>Email or phone<input name="contact" autoComplete="username" required maxLength={254} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
    <button className="primary-button" disabled={pending || !configured}>{pending ? "Opening your backpack…" : "Log in →"}</button>
    {state.message && <p role="status" className="form-status">{state.message}</p>}
  </form>;
}
