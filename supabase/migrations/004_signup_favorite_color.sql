-- Preserve existing data while updating the signup trigger to save colors.
create or replace function public.enroll_invited_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.invitations%rowtype;
  crew public.crews%rowtype;
  profile public.profiles%rowtype;
  invite_code text := new.raw_user_meta_data ->> 'invite_code';
  given_name text := btrim(new.raw_user_meta_data ->> 'first_name');
  family_name text := btrim(new.raw_user_meta_data ->> 'last_name');
  favorite_color text := coalesce(new.raw_user_meta_data ->> 'favorite_color', 'blue');
begin
  if invite_code is null or invite_code = '' then return new; end if;
  if given_name is null or length(given_name) not between 1 and 80 or
     family_name is null or length(family_name) not between 1 and 80 then
    raise exception 'First and last names are required';
  end if;
  if favorite_color not in ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink') then
    favorite_color := 'blue';
  end if;
  select * into invitation from public.invitations
    where code_hash = encode(extensions.digest(invite_code, 'sha256'), 'hex') for update;
  if not found or invitation.revoked_at is not null or
     invitation.use_count >= invitation.max_uses or
     (invitation.expires_at is not null and invitation.expires_at <= now()) then
    raise exception 'Invitation is invalid, expired, or already used';
  end if;
  select * into strict crew from public.crews where id = invitation.crew_id;
  insert into public.profiles (id, first_name, last_name, favorite_color)
    values (new.id, given_name, family_name, favorite_color) returning * into profile;
  insert into public.crew_members (crew_id, user_id) values (crew.id, new.id);
  insert into public.ledger_enrollments (user_id, player_id, crew_public_id, display_name, starting_balance_cents)
    values (new.id, profile.public_player_id, crew.public_code, profile.display_name, crew.starting_balance_cents);
  update public.invitations set use_count = use_count + 1 where id = invitation.id;
  update auth.users set raw_user_meta_data = raw_user_meta_data - 'invite_code' where id = new.id;
  return new;
end;
$$;
