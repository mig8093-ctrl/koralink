-- KoraLink MVP schema (Five-a-side only)
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_id text unique not null,
  display_name text not null,
  city text not null,
  position text not null check (position in ('GK','DEF','MID','ATT')),
  level text not null check (level in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now()
);

-- Generate a non-guessable Player ID by default (can also set in app)
create or replace function public.gen_player_id()
returns text language sql as $$
  select 'PL-' || upper(encode(gen_random_bytes(4), 'hex'));
$$;

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  city text not null,
  level text not null check (level in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now()
);

-- Team members (player can join max 3 teams)
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member')),
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create index if not exists idx_team_members_player on public.team_members(player_id);

-- Enforce max 3 teams per player
create or replace function public.enforce_max_3_teams()
returns trigger language plpgsql as $$
declare
  cnt int;
begin
  select count(*) into cnt from public.team_members where player_id = new.player_id;
  if cnt >= 3 then
    raise exception 'Player already in 3 teams (max).';
  end if;
  return new;
end $$;

drop trigger if exists trg_max_3_teams on public.team_members;
create trigger trg_max_3_teams
before insert on public.team_members
for each row execute function public.enforce_max_3_teams();

-- Invites (captain invites by Player ID; acceptance adds member immediately)
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_player uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(team_id, invited_player)
);

-- Match challenges between teams (five-a-side)
create table if not exists public.match_challenges (
  id uuid primary key default gen_random_uuid(),
  from_team uuid not null references public.teams(id) on delete cascade,
  to_team uuid not null references public.teams(id) on delete cascade,
  proposed_time timestamptz not null,
  location_text text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.match_challenges enable row level security;

-- Profiles policies
-- NOTE: MVP needs reading other players (teams, market, matches). We keep update/insert restricted to owner.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_auth" on public.profiles;
create policy "profiles_select_auth" on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Teams: public read (browse), but insert/update restricted
drop policy if exists "teams_select_auth" on public.teams;
drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public" on public.teams
for select
to public
using (true);

drop policy if exists "teams_insert_captain" on public.teams;
create policy "teams_insert_captain" on public.teams
for insert with check (auth.uid() = captain_id);

drop policy if exists "teams_update_captain" on public.teams;
create policy "teams_update_captain" on public.teams
for update using (auth.uid() = captain_id);

-- Members: authenticated can view; insert allowed if (a) self-join via invite acceptance in app, or (b) captain adds themselves at creation
drop policy if exists "members_select_auth" on public.team_members;
create policy "members_select_auth" on public.team_members
for select using (auth.role() = 'authenticated');

drop policy if exists "members_insert_self_or_captain" on public.team_members;
create policy "members_insert_self_or_captain" on public.team_members
for insert with check (
  auth.uid() = player_id
  or auth.uid() = (select captain_id from public.teams t where t.id = team_id)
);

-- Invites: authenticated can read invites involving them; captain can create for their team; invited player can update status
drop policy if exists "invites_select_involving" on public.team_invites;
create policy "invites_select_involving" on public.team_invites
for select using (
  auth.uid() = invited_player
  or auth.uid() = invited_by
  or auth.uid() = (select captain_id from public.teams t where t.id = team_id)
);

drop policy if exists "invites_insert_captain" on public.team_invites;
create policy "invites_insert_captain" on public.team_invites
for insert with check (
  auth.uid() = (select captain_id from public.teams t where t.id = team_id)
  and auth.uid() = invited_by
);

drop policy if exists "invites_update_invited_player" on public.team_invites;
create policy "invites_update_invited_player" on public.team_invites
for update using (auth.uid() = invited_player);

-- Challenges: authenticated can read; only captains can create; captains of receiving team can update status
drop policy if exists "challenges_select_auth" on public.match_challenges;
create policy "challenges_select_auth" on public.match_challenges
for select using (auth.role() = 'authenticated');

drop policy if exists "challenges_insert_captain" on public.match_challenges;
create policy "challenges_insert_captain" on public.match_challenges
for insert with check (
  auth.uid() = (select captain_id from public.teams t where t.id = from_team)
);

drop policy if exists "challenges_update_to_captain" on public.match_challenges;
create policy "challenges_update_to_captain" on public.match_challenges
for update using (
  auth.uid() = (select captain_id from public.teams t where t.id = to_team)
  or auth.uid() = (select captain_id from public.teams t where t.id = from_team)
);


-- ==========================================
-- Phone number (optional) + visibility
-- ==========================================
alter table public.profiles
add column if not exists phone text,
add column if not exists phone_visible boolean not null default false;


-- ==========================================
-- Age range (optional) + visibility
-- ==========================================
alter table public.profiles
add column if not exists age_range text,
add column if not exists age_visible boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_age_range_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_age_range_allowed
      check (age_range is null or age_range in ('u14','14_17','18_24','25_34','35_44','45_plus'));
  end if;
end $$;

-- ==========================================
-- Captain rule: creating a team requires phone visible
-- ==========================================
alter table public.teams enable row level security;

drop policy if exists "teams_insert_requires_visible_phone" on public.teams;
create policy "teams_insert_requires_visible_phone"
on public.teams
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.phone is not null
      and length(trim(p.phone)) > 0
      and p.phone_visible = true
  )
);


-- ==========================================
-- Venues (Where to play)
-- ==========================================
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text,
  price_per_hour numeric,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

alter table public.venues enable row level security;
alter table public.venue_reviews enable row level security;

drop policy if exists "venues_select_public" on public.venues;
create policy "venues_select_public" on public.venues
for select to public using (true);

drop policy if exists "venues_insert_auth" on public.venues;
create policy "venues_insert_auth" on public.venues
for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "venues_update_owner" on public.venues;
create policy "venues_update_owner" on public.venues
for update to authenticated using (auth.uid() = created_by);

drop policy if exists "venue_reviews_select_public" on public.venue_reviews;
create policy "venue_reviews_select_public" on public.venue_reviews
for select to public using (true);

drop policy if exists "venue_reviews_insert_auth" on public.venue_reviews;
create policy "venue_reviews_insert_auth" on public.venue_reviews
for insert to authenticated with check (auth.uid() = user_id);


-- ==========================================
-- Matches + attendance + stats + trust
-- ==========================================
alter table public.profiles
  add column if not exists matches_played int not null default 0,
  add column if not exists wins int not null default 0,
  add column if not exists draws int not null default 0,
  add column if not exists losses int not null default 0,
  add column if not exists motm_count int not null default 0,
  add column if not exists trust_score int not null default 100;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  city text not null,
  kickoff_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','finished','canceled')),
  team_home uuid references public.teams(id) on delete set null,
  team_away uuid references public.teams(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  location_text text,
  home_goals int,
  away_goals int,
  motm_player uuid references public.profiles(id) on delete set null,
  challenge_id uuid references public.match_challenges(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'confirmed' check (status in ('invited','confirmed','present','absent')),
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public" on public.matches
for select to public using (true);

drop policy if exists "matches_insert_auth" on public.matches;
create policy "matches_insert_auth" on public.matches
for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "matches_update_captains" on public.matches;
create policy "matches_update_captains" on public.matches
for update to authenticated using (
  auth.uid() = created_by
  or auth.uid() = (select captain_id from public.teams t where t.id = team_home)
  or auth.uid() = (select captain_id from public.teams t where t.id = team_away)
);

drop policy if exists "match_players_select_public" on public.match_players;
create policy "match_players_select_public" on public.match_players
for select to public using (true);

drop policy if exists "match_players_upsert_self" on public.match_players;
create policy "match_players_upsert_self" on public.match_players
for insert to authenticated with check (auth.uid() = player_id);

drop policy if exists "match_players_update_self_or_captain" on public.match_players;
create policy "match_players_update_self_or_captain" on public.match_players
for update to authenticated using (
  auth.uid() = player_id
  or auth.uid() = (select captain_id from public.teams t where t.id = team_id)
);


-- Security-definer RPC to apply results to player stats and trust.
create or replace function public.apply_match_result(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  home_win bool;
  away_win bool;
  is_draw bool;
begin
  select * into m from public.matches where id = p_match_id;
  if m.id is null then
    raise exception 'match not found';
  end if;
  if m.status <> 'finished' then
    raise exception 'match not finished';
  end if;
  if m.home_goals is null or m.away_goals is null then
    raise exception 'missing goals';
  end if;

  home_win := m.home_goals > m.away_goals;
  away_win := m.away_goals > m.home_goals;
  is_draw := m.home_goals = m.away_goals;

  -- Count participants: present + confirmed
  update public.profiles p
  set matches_played = p.matches_played + 1
  from public.match_players mp
  where mp.match_id = m.id
    and mp.player_id = p.id
    and mp.status in ('present','confirmed');

  -- W/D/L by team side
  if home_win then
    update public.profiles p set wins = p.wins + 1
    from public.match_players mp
    where mp.match_id = m.id and mp.player_id = p.id and mp.team_id = m.team_home and mp.status in ('present','confirmed');

    update public.profiles p set losses = p.losses + 1
    from public.match_players mp
    where mp.match_id = m.id and mp.player_id = p.id and mp.team_id = m.team_away and mp.status in ('present','confirmed');
  elsif away_win then
    update public.profiles p set wins = p.wins + 1
    from public.match_players mp
    where mp.match_id = m.id and mp.player_id = p.id and mp.team_id = m.team_away and mp.status in ('present','confirmed');

    update public.profiles p set losses = p.losses + 1
    from public.match_players mp
    where mp.match_id = m.id and mp.player_id = p.id and mp.team_id = m.team_home and mp.status in ('present','confirmed');
  elsif is_draw then
    update public.profiles p set draws = p.draws + 1
    from public.match_players mp
    where mp.match_id = m.id and mp.player_id = p.id and mp.team_id in (m.team_home, m.team_away) and mp.status in ('present','confirmed');
  end if;

  -- MOTM
  if m.motm_player is not null then
    update public.profiles set motm_count = motm_count + 1 where id = m.motm_player;
  end if;

  -- Trust penalty for no-shows (absent)
  update public.profiles p
  set trust_score = greatest(0, p.trust_score - 5)
  from public.match_players mp
  where mp.match_id = m.id and mp.player_id = p.id and mp.status = 'absent';

end;
$$;


-- ==========================================
-- Market (Free agents + roster requests)
-- ==========================================
create table if not exists public.free_agent_status (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  city text not null,
  position text not null check (position in ('GK','DEF','MID','ATT')),
  available_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.roster_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  city text not null,
  needed_position text not null check (needed_position in ('GK','DEF','MID','ATT')),
  when_text text,
  note text,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.roster_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.roster_requests(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (request_id, player_id)
);

alter table public.free_agent_status enable row level security;
alter table public.roster_requests enable row level security;
alter table public.roster_applications enable row level security;

drop policy if exists "free_agents_select_public" on public.free_agent_status;
create policy "free_agents_select_public" on public.free_agent_status
for select to public using (true);

drop policy if exists "free_agents_upsert_self" on public.free_agent_status;
create policy "free_agents_upsert_self" on public.free_agent_status
for all to authenticated using (auth.uid() = player_id) with check (auth.uid() = player_id);

drop policy if exists "roster_requests_select_public" on public.roster_requests;
create policy "roster_requests_select_public" on public.roster_requests
for select to public using (true);

drop policy if exists "roster_requests_insert_captain" on public.roster_requests;
create policy "roster_requests_insert_captain" on public.roster_requests
for insert to authenticated with check (
  auth.uid() = (select captain_id from public.teams t where t.id = team_id)
);

drop policy if exists "roster_requests_update_captain" on public.roster_requests;
create policy "roster_requests_update_captain" on public.roster_requests
for update to authenticated using (
  auth.uid() = (select captain_id from public.teams t where t.id = team_id)
);

drop policy if exists "roster_applications_select_auth" on public.roster_applications;
create policy "roster_applications_select_auth" on public.roster_applications
for select to authenticated using (true);

drop policy if exists "roster_applications_insert_self" on public.roster_applications;
create policy "roster_applications_insert_self" on public.roster_applications
for insert to authenticated with check (auth.uid() = player_id);

drop policy if exists "roster_applications_update_captain_or_self" on public.roster_applications;
create policy "roster_applications_update_captain_or_self" on public.roster_applications
for update to authenticated using (
  auth.uid() = player_id
  or auth.uid() = (
    select captain_id
    from public.teams t
    join public.roster_requests r on r.team_id = t.id
    where r.id = request_id
  )
);


-- ==========================================
-- Limited chat (only after accepted challenge)
-- ==========================================
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid unique references public.match_challenges(id) on delete cascade,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_rooms_select_auth" on public.chat_rooms;
create policy "chat_rooms_select_auth" on public.chat_rooms
for select to authenticated using (true);

drop policy if exists "chat_rooms_upsert_captains" on public.chat_rooms;
create policy "chat_rooms_upsert_captains" on public.chat_rooms
for insert to authenticated with check (true);

drop policy if exists "chat_messages_select_auth" on public.chat_messages;
create policy "chat_messages_select_auth" on public.chat_messages
for select to authenticated using (true);

drop policy if exists "chat_messages_insert_auth" on public.chat_messages;
create policy "chat_messages_insert_auth" on public.chat_messages
for insert to authenticated with check (auth.uid() = sender_id);
