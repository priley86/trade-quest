import Link from "next/link";
import { requireAdmin, type Crew, type Profile } from "../../lib/auth";
import { AppShell, PageIntro } from "../ui";
import { CrewForm, InvitationForm, RevokeForm, UserControls } from "./forms";
function expired(value: string) { return new Date(value).getTime() <= Date.now(); }

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { profile, supabase } = await requireAdmin();
  const params = await searchParams;
  const requested = Number(params.page || 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested < 10000 ? requested : 1;
  const [crewResult, inviteResult, userResult] = await Promise.all([
    supabase.from("crews").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("invitations").select("id,crew_id,expires_at,max_uses,use_count,revoked_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("id,first_name,last_name,role,public_player_id,display_name", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * 25, page * 25 - 1),
  ]);
  if (crewResult.error || inviteResult.error || userResult.error) throw new Error("Could not load admin data. Check the Supabase schema.");
  const crews = crewResult.data as Crew[];
  const profiles = userResult.data as Profile[];
  return <AppShell profile={profile}><PageIntro eyebrow="Admin camp" title="Crew control center" text="Welcome explorers, personalize their crew, and manage game access." />
    <section className="admin-columns"><article className="admin-card"><h2>Create a crew</h2><CrewForm /></article><article className="admin-card"><h2>Make an invitation</h2><InvitationForm crews={crews} /></article></section>
    <section className="admin-section"><h2>Your crews</h2>{!crews.length && <p>Create a crew to get started.</p>}{crews.map(c => <details className="admin-card" key={c.id}><summary><b>{c.name}</b> · {c.public_code}</summary><CrewForm crew={c} /></details>)}</section>
    <section className="admin-section"><h2>Recent invitations</h2><p>Showing the latest 50 invitations. Links are only displayed when created.</p>{inviteResult.data.map(i => <article className="admin-card invitation-row" key={i.id}><div><b>{crews.find(c => c.id === i.crew_id)?.name || "Crew"}</b><p>{i.use_count} of {i.max_uses} players joined · {i.revoked_at ? "Revoked" : i.expires_at && expired(i.expires_at) ? "Expired" : i.use_count >= i.max_uses ? "Used up" : "Active"}{i.expires_at && ` · Expires ${i.expires_at.slice(0, 10)}`}</p></div>{!i.revoked_at && <RevokeForm id={i.id} />}</article>)}</section>
    <section className="admin-section"><h2>Players and admins</h2>{profiles.map(p => <article className="admin-card" key={p.id}><h3>{p.first_name} {p.last_name}</h3><p>{p.display_name} · {p.role}</p><UserControls profile={p} self={p.id === profile.id} /></article>)}
      <nav className="pagination" aria-label="Players pages">{page > 1 && <Link href={`/admin?page=${page - 1}`}>← Previous</Link>}<span>Page {page}</span>{page * 25 < (userResult.count || 0) && <Link href={`/admin?page=${page + 1}`}>Next →</Link>}</nav>
    </section></AppShell>;
}
