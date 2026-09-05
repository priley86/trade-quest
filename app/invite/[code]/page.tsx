import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { findInvitation } from "../../../lib/invitations";
import { authConfigured } from "../../../lib/supabase/config";
import { SignupForm } from "../../auth/forms";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const demo = code === "demo-quest";
  let message = "This invitation is expired, used, or unavailable. Ask your crew leader for a new link.";
  let crew;
  try {
    crew = demo ? { name: "Pine Ridge Explorers", public_code: "PINE-742", welcome_greeting: "Welcome, adventurers! Let’s learn, trade, and grow our treasure together.", logo_url: null }
      : authConfigured() ? await findInvitation(code) : null;
    if (!authConfigured() && !demo) message = "Your crew’s signup is not connected yet. Please try again after your crew leader finishes setup.";
  } catch { message = "We couldn’t open this invitation right now. Please try again shortly."; }
  return <main className="auth-page"><div className="auth-wrap">
    <section className="invite-card">{crew ? <>
      <Image className="hero-logo invite-logo" src="/trade-quest-logo.png" width={126} height={126} alt="TradeQuest Investor" priority />
      <span className="eyebrow">You’re invited to join</span>
      <h1>{crew.name}</h1>
      {crew.logo_url ? <Image className="crew-logo" src={crew.logo_url} alt={`${crew.name} logo`} width={80} height={80} unoptimized referrerPolicy="no-referrer" /> : <div className="crew-mark">🌲</div>}
      <p className="welcome">{crew.welcome_greeting}</p>
      <div className="crew-code">Crew ID <b>{crew.public_code}</b></div>
      {demo && <p className="notice">Sample invitation. Your crew leader will give you a real signup link.</p>}
      <SignupForm code={code} disabled={demo} />
    </> : <><h1>Let’s find your crew</h1><p>{message}</p></>}
    <p className="signin-note">Already an explorer? <Link href="/login">Log in</Link></p></section>
    <p className="parent-note">All game money is pretend money.</p></div></main>;
}
