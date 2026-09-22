create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.tournament_type as enum (
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'free_for_all',
  'leaderboard'
);

create type public.game_status as enum (
  'open',
  'full',
  'drafted',
  'completed',
  'archived'
);

create type public.match_status as enum (
  'pending',
  'ready',
  'complete',
  'bye'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  status public.game_status not null default 'open',
  tournament_type public.tournament_type not null default 'single_elimination',
  created_by uuid not null references public.profiles (id) on delete restrict,
  creator_participates boolean not null default true,
  max_participants integer check (max_participants is null or max_participants between 2 and 128),
  invite_token uuid not null default gen_random_uuid() unique,
  randomized_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_participants (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seed_position integer check (seed_position is null or seed_position > 0),
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create unique index game_participants_seed_unique
  on public.game_participants (game_id, seed_position)
  where seed_position is not null;
create index game_participants_user_id_idx on public.game_participants (user_id);

create table public.tournament_matches (
  id uuid primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  round integer not null check (round > 0),
  slot integer not null check (slot > 0),
  participant_a_id uuid,
  participant_b_id uuid,
  winner_id uuid,
  status public.match_status not null default 'pending',
  next_match_id uuid,
  next_slot text check (next_slot is null or next_slot in ('a', 'b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, round, slot),
  foreign key (game_id, participant_a_id)
    references public.game_participants (game_id, user_id),
  foreign key (game_id, participant_b_id)
    references public.game_participants (game_id, user_id),
  foreign key (game_id, winner_id)
    references public.game_participants (game_id, user_id),
  foreign key (next_match_id)
    references public.tournament_matches (id)
    deferrable initially deferred,
  check (winner_id is null or winner_id = participant_a_id or winner_id = participant_b_id),
  check ((next_match_id is null and next_slot is null) or (next_match_id is not null and next_slot is not null))
);

create index tournament_matches_game_round_idx
  on public.tournament_matches (game_id, round, slot);
create index tournament_matches_next_match_idx
  on public.tournament_matches (next_match_id)
  where next_match_id is not null;

create table public.randomization_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games (id) on delete cascade,
  algorithm_version text not null,
  seed text not null,
  participant_snapshot uuid[] not null,
  ordered_participant_ids uuid[] not null,
  order_hash text not null,
  triggered_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (cardinality(participant_snapshot) >= 2),
  check (cardinality(participant_snapshot) = cardinality(ordered_participant_ids))
);

create index randomization_events_triggered_by_idx
  on public.randomization_events (triggered_by);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create index games_created_by_idx on public.games (created_by);
create index games_status_created_at_idx on public.games (status, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger games_set_updated_at
before update on public.games
for each row execute function private.set_updated_at();

create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row execute function private.set_updated_at();

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function private.set_updated_at();

create or replace function private.is_game_member(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.game_participants gp
      where gp.game_id = p_game_id
        and gp.user_id = (select auth.uid())
    );
$$;

create or replace function private.shares_game_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.game_participants mine
      join public.game_participants theirs on theirs.game_id = mine.game_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = p_profile_id
    );
$$;

revoke execute on function private.is_game_member(uuid) from public, anon, service_role;
revoke execute on function private.shares_game_with(uuid) from public, anon, service_role;
grant execute on function private.is_game_member(uuid) to authenticated;
grant execute on function private.shares_game_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_participants enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.randomization_events enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_select_shared
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.shares_game_with(id))
);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy games_select_member_or_creator
on public.games for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_game_member(id))
);

create policy participants_select_member_or_creator
on public.game_participants for select
to authenticated
using (
  (select private.is_game_member(game_id))
  or exists (
    select 1 from public.games g
    where g.id = game_id and g.created_by = (select auth.uid())
  )
);

create policy matches_select_member_or_creator
on public.tournament_matches for select
to authenticated
using (
  (select private.is_game_member(game_id))
  or exists (
    select 1 from public.games g
    where g.id = game_id and g.created_by = (select auth.uid())
  )
);

create policy randomization_select_member_or_creator
on public.randomization_events for select
to authenticated
using (
  (select private.is_game_member(game_id))
  or exists (
    select 1 from public.games g
    where g.id = game_id and g.created_by = (select auth.uid())
  )
);

create policy push_subscriptions_select_own
on public.push_subscriptions for select
to authenticated
using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own
on public.push_subscriptions for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy push_subscriptions_update_own
on public.push_subscriptions for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own
on public.push_subscriptions for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select (
  id, name, description, status, tournament_type, created_by,
  creator_participates, max_participants, randomized_at, completed_at,
  archived_at, created_at, updated_at
) on public.games to authenticated;
grant select on public.game_participants to authenticated;
grant select on public.tournament_matches to authenticated;
grant select on public.randomization_events to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create or replace function public.service_create_game(
  p_creator_id uuid,
  p_name text,
  p_description text,
  p_max_participants integer,
  p_creator_participates boolean
)
returns public.games
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_game public.games;
begin
  if p_max_participants is not null and (p_max_participants < 2 or p_max_participants > 128) then
    raise exception 'Participant limit must be between 2 and 128';
  end if;

  if not exists (select 1 from public.profiles where id = p_creator_id) then
    raise exception 'Creator profile does not exist';
  end if;

  insert into public.games (
    name, description, created_by, max_participants, creator_participates
  ) values (
    trim(p_name), nullif(trim(p_description), ''), p_creator_id,
    p_max_participants, p_creator_participates
  ) returning * into created_game;

  if p_creator_participates then
    insert into public.game_participants (game_id, user_id)
    values (created_game.id, p_creator_id);
  end if;

  return created_game;
end;
$$;

create or replace function public.service_join_game(
  p_user_id uuid,
  p_full_name text,
  p_invite_token uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  participant_count integer;
begin
  select * into selected_game
  from public.games
  where invite_token = p_invite_token
  for update;

  if selected_game.id is null then
    raise exception 'This invitation is not valid';
  end if;

  if selected_game.status not in ('open', 'full') then
    raise exception 'This game is no longer accepting participants';
  end if;

  insert into public.profiles (id, full_name)
  values (p_user_id, trim(p_full_name))
  on conflict (id) do update set full_name = excluded.full_name;

  if exists (
    select 1 from public.game_participants
    where game_id = selected_game.id and user_id = p_user_id
  ) then
    return selected_game.id;
  end if;

  select count(*) into participant_count
  from public.game_participants
  where game_id = selected_game.id;

  if selected_game.max_participants is not null
    and participant_count >= selected_game.max_participants then
    raise exception 'This game is full';
  end if;

  insert into public.game_participants (game_id, user_id)
  values (selected_game.id, p_user_id);

  participant_count := participant_count + 1;
  if selected_game.max_participants is not null
    and participant_count >= selected_game.max_participants then
    update public.games set status = 'full' where id = selected_game.id;
  end if;

  return selected_game.id;
end;
$$;

create or replace function public.service_leave_game(
  p_game_id uuid,
  p_user_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
begin
  select * into selected_game from public.games where id = p_game_id for update;
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('open', 'full') then
    raise exception 'Participants cannot be removed after the draft is locked';
  end if;
  if p_actor_id <> p_user_id and selected_game.created_by <> p_actor_id then
    raise exception 'You cannot remove this participant';
  end if;

  delete from public.game_participants
  where game_id = p_game_id and user_id = p_user_id;

  if selected_game.status = 'full' then
    update public.games set status = 'open' where id = p_game_id;
  end if;
end;
$$;

create or replace function public.service_finalize_game(
  p_game_id uuid,
  p_actor_id uuid,
  p_algorithm_version text,
  p_seed text,
  p_participant_snapshot uuid[],
  p_ordered_participant_ids uuid[],
  p_order_hash text,
  p_matches jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  current_participants uuid[];
begin
  select * into selected_game from public.games where id = p_game_id for update;
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.created_by <> p_actor_id then raise exception 'Only the creator can start this game'; end if;
  if selected_game.status not in ('open', 'full') or selected_game.randomized_at is not null then
    raise exception 'This game has already been started';
  end if;

  select array_agg(user_id order by user_id) into current_participants
  from public.game_participants where game_id = p_game_id;

  if cardinality(current_participants) < 2 then
    raise exception 'At least two participants are required';
  end if;
  if current_participants is distinct from (
    select array_agg(value order by value) from unnest(p_participant_snapshot) value
  ) then
    raise exception 'The participant list changed; refresh and try again';
  end if;
  if cardinality(p_ordered_participant_ids) <> cardinality(current_participants)
    or (select count(distinct value) from unnest(p_ordered_participant_ids) value)
      <> cardinality(current_participants) then
    raise exception 'The randomized order is invalid';
  end if;

  update public.game_participants gp
  set seed_position = ordered.ordinality
  from unnest(p_ordered_participant_ids) with ordinality as ordered(user_id, ordinality)
  where gp.game_id = p_game_id and gp.user_id = ordered.user_id;

  if (select count(*) from public.game_participants where game_id = p_game_id and seed_position is not null)
    <> cardinality(current_participants) then
    raise exception 'The randomized order does not match the participant list';
  end if;

  insert into public.tournament_matches (
    id, game_id, round, slot, participant_a_id, participant_b_id,
    winner_id, status, next_match_id, next_slot
  )
  select
    (match ->> 'id')::uuid,
    p_game_id,
    (match ->> 'round')::integer,
    (match ->> 'slot')::integer,
    nullif(match ->> 'participantAId', '')::uuid,
    nullif(match ->> 'participantBId', '')::uuid,
    nullif(match ->> 'winnerId', '')::uuid,
    (match ->> 'status')::public.match_status,
    nullif(match ->> 'nextMatchId', '')::uuid,
    nullif(match ->> 'nextSlot', '')
  from jsonb_array_elements(p_matches) match;

  insert into public.randomization_events (
    game_id, algorithm_version, seed, participant_snapshot,
    ordered_participant_ids, order_hash, triggered_by
  ) values (
    p_game_id, p_algorithm_version, p_seed, p_participant_snapshot,
    p_ordered_participant_ids, p_order_hash, p_actor_id
  );

  update public.games
  set status = 'drafted', randomized_at = now()
  where id = p_game_id;
end;
$$;

create or replace function public.service_record_match_result(
  p_game_id uuid,
  p_match_id uuid,
  p_winner_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  selected_match public.tournament_matches;
  next_match public.tournament_matches;
begin
  select * into selected_game from public.games where id = p_game_id for update;
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.created_by <> p_actor_id then raise exception 'Only the creator can record results'; end if;

  select * into selected_match
  from public.tournament_matches
  where id = p_match_id and game_id = p_game_id
  for update;

  if selected_match.id is null then raise exception 'Match not found'; end if;
  if selected_match.status = 'complete' and selected_match.winner_id = p_winner_id then
    return selected_game.status = 'completed';
  end if;
  if selected_game.status <> 'drafted' then raise exception 'This game is not active'; end if;
  if selected_match.status <> 'ready' then raise exception 'This match is not ready'; end if;
  if p_winner_id is distinct from selected_match.participant_a_id
    and p_winner_id is distinct from selected_match.participant_b_id then
    raise exception 'Winner must be a participant in this match';
  end if;

  update public.tournament_matches
  set winner_id = p_winner_id, status = 'complete'
  where id = selected_match.id;

  if selected_match.next_match_id is null then
    update public.games
    set status = 'completed', completed_at = now()
    where id = p_game_id;
    return true;
  end if;

  if selected_match.next_slot = 'a' then
    update public.tournament_matches
    set participant_a_id = p_winner_id
    where id = selected_match.next_match_id
    returning * into next_match;
  else
    update public.tournament_matches
    set participant_b_id = p_winner_id
    where id = selected_match.next_match_id
    returning * into next_match;
  end if;

  if next_match.participant_a_id is not null and next_match.participant_b_id is not null then
    update public.tournament_matches set status = 'ready' where id = next_match.id;
  end if;

  return false;
end;
$$;

create or replace function public.service_archive_game(
  p_game_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.games
  set status = 'archived', archived_at = now()
  where id = p_game_id and created_by = p_actor_id;
  if not found then raise exception 'Only the creator can archive this game'; end if;
end;
$$;

revoke execute on function public.service_create_game(uuid, text, text, integer, boolean) from public, anon, authenticated;
revoke execute on function public.service_join_game(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.service_leave_game(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.service_finalize_game(uuid, uuid, text, text, uuid[], uuid[], text, jsonb) from public, anon, authenticated;
revoke execute on function public.service_record_match_result(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.service_archive_game(uuid, uuid) from public, anon, authenticated;

grant execute on function public.service_create_game(uuid, text, text, integer, boolean) to service_role;
grant execute on function public.service_join_game(uuid, text, uuid) to service_role;
grant execute on function public.service_leave_game(uuid, uuid, uuid) to service_role;
grant execute on function public.service_finalize_game(uuid, uuid, text, text, uuid[], uuid[], text, jsonb) to service_role;
grant execute on function public.service_record_match_result(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.service_archive_game(uuid, uuid) to service_role;
