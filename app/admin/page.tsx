import Link from "next/link";
import { requireAdmin, type Crew, type Profile } from "../../lib/auth";
import { AppShell, PageIntro } from "../ui";
import { CrewForm, InvitationForm, RevokeForm, UserControls } from "./forms";
function expired(value: string) {
  return new Date(value).getTime() <= Date.now();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { profile, supabase } = await requireAdmin();
  const params = await searchParams;
  const requested = Number(params.page || 1);
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested < 10000
      ? requested
      : 1;
  const [crewResult, inviteResult, userResult] = await Promise.all([
    supabase
      .from("crews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("invitations")
      .select("id,crew_id,expires_at,max_uses,use_count,revoked_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id,first_name,last_name,role,public_player_id,display_name", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 25, page * 25 - 1),
  ]);
  if (crewResult.error || inviteResult.error || userResult.error)
    throw new Error("Could not load admin data. Check the Supabase schema.");
  const crews = crewResult.data as Crew[];
  const profiles = userResult.data as Profile[];
  const { data: memberships, error: membershipsError } = profiles.length
    ? await supabase
        .from("crew_members")
        .select("user_id,crew_id")
        .in(
          "user_id",
          profiles.map((player) => player.id),
        )
    : { data: [], error: null };
  if (membershipsError) throw new Error("Could not load crew memberships.");
  const crewByUser = new Map(
    memberships.map((membership) => [membership.user_id, membership.crew_id]),
  );
  const profilesByCrew = new Map<string, Profile[]>();
  for (const player of profiles) {
    const crewId = crewByUser.get(player.id) || "unassigned";
    profilesByCrew.set(crewId, [...(profilesByCrew.get(crewId) || []), player]);
  }
  const activeInvitations = inviteResult.data.filter(
    (invitation) =>
      !invitation.revoked_at &&
      !(invitation.expires_at && expired(invitation.expires_at)) &&
      invitation.use_count < invitation.max_uses,
  );
  return (
    <AppShell profile={profile}>
      <PageIntro
        eyebrow="Admin camp"
        title="Crew control center"
        text="Welcome explorers, personalize their crew, and manage game access."
      />
      <section className="admin-columns">
        <article className="admin-card">
          <h2>Create a crew</h2>
          <CrewForm />
        </article>
        <article className="admin-card">
          <h2>Make an invitation</h2>
          <InvitationForm crews={crews} />
        </article>
      </section>
      <section className="admin-section">
        <h2>Your crews</h2>
        {!crews.length && <p>Create a crew to get started.</p>}
        {crews.map((c) => (
          <details className="admin-card" key={c.id}>
            <summary>
              <b>{c.name}</b> · {c.public_code}
            </summary>
            <CrewForm crew={c} />
          </details>
        ))}
      </section>
      <section className="admin-section">
        <h2>Recent invitations</h2>
        <p>
          Showing active invitations from the latest 50. Links are only
          displayed when created.
        </p>
        {!activeInvitations.length && <p>No active invitations.</p>}
        {activeInvitations.map((i) => (
          <article className="admin-card invitation-row" key={i.id}>
            <div>
              <b>{crews.find((c) => c.id === i.crew_id)?.name || "Crew"}</b>
              <p>
                {i.use_count} of {i.max_uses} players joined · Active
                {i.expires_at && ` · Expires ${i.expires_at.slice(0, 10)}`}
              </p>
            </div>
            {!i.revoked_at && <RevokeForm id={i.id} />}
          </article>
        ))}
      </section>
      <section className="admin-section">
        <h2>Players and admins</h2>
        {[...profilesByCrew.entries()].map(([crewId, crewProfiles]) => (
          <div key={crewId} className="admin-group">
            <h3>
              {crews.find((crew) => crew.id === crewId)?.name ||
                "No crew assigned"}
            </h3>
            {crewProfiles.map((p) => (
              <article className="admin-card" key={p.id}>
                <h3>
                  {p.first_name} {p.last_name}
                </h3>
                <p>
                  {p.display_name} · {p.role}
                </p>
                <UserControls profile={p} self={p.id === profile.id} />
              </article>
            ))}
          </div>
        ))}
        <nav className="pagination" aria-label="Players pages">
          {page > 1 && <Link href={`/admin?page=${page - 1}`}>← Previous</Link>}
          <span>Page {page}</span>
          {page * 25 < (userResult.count || 0) && (
            <Link href={`/admin?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
      </section>
    </AppShell>
  );
}
