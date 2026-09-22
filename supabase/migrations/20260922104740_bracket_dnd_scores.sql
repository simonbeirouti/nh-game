alter table public.tournament_matches
  add column participant_a_score integer
    check (participant_a_score is null or participant_a_score >= 0),
  add column participant_b_score integer
    check (participant_b_score is null or participant_b_score >= 0);

create or replace function public.service_admin_reseed_participant(
  p_game_id uuid,
  p_user_id uuid,
  p_target_seed integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  old_order uuid[];
  remaining_order uuid[];
  new_order uuid[];
  current_seed integer;
  participant_count integer;
begin
  select * into selected_game
  from public.games
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status <> 'drafted' then
    raise exception 'Seeds can only be changed for an active draw';
  end if;
  if exists (
    select 1
    from public.tournament_matches
    where game_id = p_game_id and status = 'complete'
  ) then
    raise exception 'Seeds cannot be changed after a result is recorded';
  end if;

  perform 1
  from public.game_participants
  where game_id = p_game_id
  order by user_id
  for update;

  select array_agg(user_id order by seed_position), count(*)
  into old_order, participant_count
  from public.game_participants
  where game_id = p_game_id and seed_position is not null;

  current_seed := array_position(old_order, p_user_id);
  if current_seed is null then raise exception 'Seeded participant not found'; end if;
  if p_target_seed < 1 or p_target_seed > participant_count then
    raise exception 'Target seed is outside the draw';
  end if;
  if current_seed = p_target_seed then return; end if;

  remaining_order := array_remove(old_order, p_user_id);
  if p_target_seed = 1 then
    new_order := array[p_user_id] || remaining_order;
  elsif p_target_seed > array_length(remaining_order, 1) then
    new_order := remaining_order || array[p_user_id];
  else
    new_order := remaining_order[1:p_target_seed - 1]
      || array[p_user_id]
      || remaining_order[p_target_seed:array_length(remaining_order, 1)];
  end if;

  with participant_mapping as (
    select old_order[position] as old_id, new_order[position] as new_id
    from generate_subscripts(old_order, 1) as position
  )
  update public.tournament_matches as matches
  set
    participant_a_id = coalesce(
      (
        select new_id
        from participant_mapping
        where old_id = matches.participant_a_id
      ),
      matches.participant_a_id
    ),
    participant_b_id = coalesce(
      (
        select new_id
        from participant_mapping
        where old_id = matches.participant_b_id
      ),
      matches.participant_b_id
    ),
    winner_id = coalesce(
      (
        select new_id
        from participant_mapping
        where old_id = matches.winner_id
      ),
      matches.winner_id
    )
  where matches.game_id = p_game_id;

  update public.game_participants
  set seed_position = null
  where game_id = p_game_id;

  update public.game_participants as participants
  set seed_position = reordered.seed_position
  from unnest(new_order) with ordinality as reordered(user_id, seed_position)
  where participants.game_id = p_game_id
    and participants.user_id = reordered.user_id;

  update public.games set updated_at = now() where id = p_game_id;
end;
$$;

create or replace function public.service_admin_update_match_score(
  p_game_id uuid,
  p_match_id uuid,
  p_participant_a_score integer,
  p_participant_b_score integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  selected_match public.tournament_matches;
begin
  select * into selected_game
  from public.games
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('drafted', 'completed') then
    raise exception 'Scores can only be changed for an active or completed draw';
  end if;
  if p_participant_a_score is not null and p_participant_a_score < 0 then
    raise exception 'Scores cannot be negative';
  end if;
  if p_participant_b_score is not null and p_participant_b_score < 0 then
    raise exception 'Scores cannot be negative';
  end if;

  select * into selected_match
  from public.tournament_matches
  where id = p_match_id and game_id = p_game_id
  for update;

  if selected_match.id is null then raise exception 'Match not found'; end if;
  if selected_match.participant_a_id is null or selected_match.participant_b_id is null then
    raise exception 'Both participants are required before recording a score';
  end if;

  update public.tournament_matches
  set
    participant_a_score = p_participant_a_score,
    participant_b_score = p_participant_b_score
  where id = p_match_id;

  update public.games set updated_at = now() where id = p_game_id;
end;
$$;

revoke all on function public.service_admin_reseed_participant(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.service_admin_update_match_score(uuid, uuid, integer, integer)
  from public, anon, authenticated;

grant execute on function public.service_admin_reseed_participant(uuid, uuid, integer)
  to service_role;
grant execute on function public.service_admin_update_match_score(uuid, uuid, integer, integer)
  to service_role;
