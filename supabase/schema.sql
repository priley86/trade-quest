-- Run once in a new Supabase project's SQL editor. For the old scaffold schema,
-- run supabase/migrations/002_accounts.sql instead. This file includes that migration.
create extension if not exists pgcrypto with schema extensions;
create type public.app_role as enum ('player', 'admin');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role public.app_role not null default 'player',
  created_at timestamptz not null default now()
);
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  name text not null,
  welcome_greeting text not null default 'Welcome, explorers!',
  logo_url text,
  starting_balance_cents bigint not null default 100000 check (starting_balance_cents >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  crew_id uuid not null references public.crews(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
-- Upgrade the original TradeQuest scaffold. Also appended to schema.sql for fresh installs.
-- Run as the database owner, never from a browser client.
begin;
alter table public.profiles add column if not exists public_player_id uuid not null default gen_random_uuid();
create unique index if not exists profiles_public_player_id_key on public.profiles(public_player_id);
alter table public.profiles add column if not exists display_name text not null default ('Explorer ' || substr(gen_random_uuid()::text, 1, 8));
-- The first version supports one crew per player; do not silently discard existing memberships.
create unique index if not exists crew_members_one_crew_per_user on public.crew_members(user_id);
alter table public.crews alter column created_by drop not null;
alter table public.crews drop constraint if exists crews_created_by_fkey;
alter table public.crews add constraint crews_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.invitations alter column created_by drop not null;
alter table public.invitations drop constraint if exists invitations_created_by_fkey;
alter table public.invitations add constraint invitations_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

-- Durable private record of the initial public ledger allocation. Retried Dolt writes
-- use INSERT IGNORE, never reset an existing player's balance.
create table if not exists public.ledger_enrollments (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  player_id uuid not null unique,
  crew_public_id text not null,
  display_name text not null,
  starting_balance_cents bigint not null check (starting_balance_cents >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_crew_member(target_crew uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crew_members where crew_id = target_crew and user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
revoke all on function public.is_crew_member(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_crew_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.invitations enable row level security;
alter table public.ledger_enrollments enable row level security;
-- Remove the scaffold policies, including its recursive roster policy.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "members read their crews" on public.crews;
drop policy if exists "admins manage crews" on public.crews;
drop policy if exists "crew members read roster" on public.crew_members;
drop policy if exists "admins manage memberships" on public.crew_members;
drop policy if exists "admins manage invitations" on public.invitations;
drop policy if exists profiles_read on public.profiles;
drop policy if exists crews_read on public.crews;
drop policy if exists crews_admin on public.crews;
drop policy if exists roster_read on public.crew_members;
drop policy if exists invitations_admin on public.invitations;
drop policy if exists enrollments_read on public.ledger_enrollments;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy crews_read on public.crews for select to authenticated using (public.is_admin() or public.is_crew_member(id));
create policy crews_admin on public.crews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy roster_read on public.crew_members for select to authenticated using (public.is_admin() or public.is_crew_member(crew_id));
create policy invitations_admin on public.invitations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy enrollments_read on public.ledger_enrollments for select to authenticated using (user_id = auth.uid());
-- Role changes and deletes go through checked server actions. No browser mutation
-- privileges on profiles, membership, or ledger enrollment, even for an admin JWT.
revoke all on public.profiles, public.crews, public.crew_members, public.invitations, public.ledger_enrollments from anon, authenticated;
grant select on public.profiles, public.crew_members, public.ledger_enrollments to authenticated;
grant select, insert, update, delete on public.crews, public.invitations to authenticated;
grant all on public.profiles, public.crews, public.crew_members, public.invitations, public.ledger_enrollments to service_role;

create or replace function public.enroll_invited_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.invitations%rowtype;
  crew public.crews%rowtype;
  profile public.profiles%rowtype;
  invite_code text := new.raw_user_meta_data ->> 'invite_code';
  given_name text := btrim(new.raw_user_meta_data ->> 'first_name');
  family_name text := btrim(new.raw_user_meta_data ->> 'last_name');
begin
  -- Dashboard-created Auth users can exist without membership, but have no game
  -- access until a database owner bootstraps a profile (see README).
  if invite_code is null or invite_code = '' then return new; end if;
  if given_name is null or length(given_name) not between 1 and 80 or
     family_name is null or length(family_name) not between 1 and 80 then
    raise exception 'First and last names are required';
  end if;
  -- Lock serializes concurrent signups using the final available invitation use.
  select * into invitation from public.invitations
    where code_hash = encode(extensions.digest(invite_code, 'sha256'), 'hex') for update;
  if not found or invitation.revoked_at is not null or
     invitation.use_count >= invitation.max_uses or
     (invitation.expires_at is not null and invitation.expires_at <= now()) then
    raise exception 'Invitation is invalid, expired, or already used';
  end if;
  select * into strict crew from public.crews where id = invitation.crew_id;
  insert into public.profiles (id, first_name, last_name)
    values (new.id, given_name, family_name) returning * into profile;
  insert into public.crew_members (crew_id, user_id) values (crew.id, new.id);
  insert into public.ledger_enrollments (user_id, player_id, crew_public_id, display_name, starting_balance_cents)
    values (new.id, profile.public_player_id, crew.public_code, profile.display_name, crew.starting_balance_cents);
  update public.invitations set use_count = use_count + 1 where id = invitation.id;
  update auth.users set raw_user_meta_data = raw_user_meta_data - 'invite_code' where id = new.id;
  return new;
end;
$$;
revoke all on function public.enroll_invited_user() from public, anon, authenticated;
drop trigger if exists tradequest_enroll_user on auth.users;
create trigger tradequest_enroll_user after insert on auth.users for each row execute function public.enroll_invited_user();
commit;

-- Serialize role changes and deletion claims; no last-admin or concurrent promotion race.
alter table public.profiles add column if not exists deletion_pending boolean not null default false;
create or replace function public.set_player_role(target_user uuid, target_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7421001);
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_user = auth.uid() then raise exception 'Cannot change own role'; end if;
  update public.profiles set role = target_role where id = target_user and not deletion_pending;
  if not found then raise exception 'Player unavailable'; end if;
end;
$$;
create or replace function public.claim_player_deletion(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7421001);
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_user = auth.uid() then raise exception 'Cannot delete own account'; end if;
  update public.profiles set deletion_pending = true
    where id = target_user and role = 'player' and not deletion_pending;
  if not found then raise exception 'Player unavailable or is an admin'; end if;
end;
$$;
revoke all on function public.set_player_role(uuid, public.app_role) from public, anon;
revoke all on function public.claim_player_deletion(uuid) from public, anon;
grant execute on function public.set_player_role(uuid, public.app_role) to authenticated;
grant execute on function public.claim_player_deletion(uuid) to authenticated;
