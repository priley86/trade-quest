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
