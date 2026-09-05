import Image from "next/image";
import Link from "next/link";
import { authConfigured } from "../../lib/supabase/config";
import { LoginForm } from "../auth/forms";
export default function LoginPage() {
  const configured = authConfigured();
  return <main className="auth-page"><div className="auth-wrap narrow">
    <section className="invite-card"><span className="eyebrow">Welcome back</span><h1>Continue your quest</h1>
      <Image className="hero-logo login-logo" src="/trade-quest-logo.png" width={180} height={180} alt="TradeQuest Investor" priority />
      {!configured && <p className="notice">Accounts aren’t connected yet. You can explore the sample game below.</p>}
      <LoginForm configured={configured} />
      <p className="signin-note">Joining for the first time? Open the invitation from your crew leader.</p>
      <Link className="text-link" href="/demo">Explore the demo</Link>
    </section></div></main>;
}
