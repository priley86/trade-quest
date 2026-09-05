import Link from "next/link";
export default function ConfirmationError() {
  return <main className="auth-page"><section className="auth-wrap invite-card"><h1>That link didn’t work</h1><p>It may have expired or already been used. Try logging in if you have already confirmed your account. Otherwise, ask your crew leader for help.</p><Link className="primary-button" href="/login">Go to login</Link></section></main>;
}
