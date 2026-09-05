import Image from "next/image";
import { getCrew, requirePlayer } from "../../lib/auth";
import { AppShell, PageIntro } from "../ui";
import { ProfileForm } from "./form";
export default async function ProfilePage() {
  const { profile, user } = await requirePlayer();
  const crew = await getCrew();
  const contact = user.email || user.phone || "";
  return <AppShell profile={profile}><PageIntro eyebrow="Your explorer profile" title="Your profile" text="Keep your account details up to date and see which crew you’re exploring with." />
    <section className="profile-columns"><article className="admin-card"><h2>User info</h2><p>Your username, name, and password are private to your account.</p><ProfileForm firstName={profile.first_name} lastName={profile.last_name} contact={contact} /></article>
      <article className="admin-card crew-info-card"><h2>Crew info</h2>{crew ? <><div className="crew-info-logo">{crew.logo_url ? <Image src={crew.logo_url} alt={`${crew.name} logo`} width={96} height={96} unoptimized referrerPolicy="no-referrer" /> : <span>🌲</span>}</div><h3>{crew.name}</h3><p>{crew.welcome_greeting}</p><div className="crew-code">Crew ID <b>{crew.public_code}</b></div><p className="muted-copy">Your crew details are managed by an administrator.</p></> : <p>You haven’t joined a crew yet.</p>}</article></section>
  </AppShell>;
}
