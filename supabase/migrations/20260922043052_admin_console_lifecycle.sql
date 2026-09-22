create or replace function public.service_admin_update_game(
  p_game_id uuid,
  p_name text,
  p_description text,
  p_max_participants integer
)
returns public.games
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
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if char_length(trim(p_name)) not between 2 and 100 then
    raise exception 'Game name must be between 2 and 100 characters';
  end if;
  if char_length(p_description) > 1000 then
    raise exception 'Description must be 1000 characters or fewer';
  end if;
  if p_max_participants is not null and p_max_participants not between 2 and 128 then
    raise exception 'Participant limit must be between 2 and 128';
  end if;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  if p_max_participants is not null and p_max_participants < participant_count then
    raise exception 'Participant limit cannot be lower than the current participant count';
  end if;

  update public.games
  set
    name = trim(p_name),
    description = nullif(trim(p_description), ''),
    max_participants = p_max_participants,
    status = case
      when status not in ('open', 'full') then status
      when p_max_participants is not null and participant_count >= p_max_participants then 'full'::public.game_status
      else 'open'::public.game_status
    end
  where id = p_game_id
  returning * into selected_game;

  return selected_game;
end;
$$;

create or replace function public.service_admin_add_participant(
  p_game_id uuid,
  p_user_id uuid
)
returns void
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
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('open', 'full') then
    raise exception 'Reset or unarchive the game before changing participants';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User profile not found';
  end if;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  if selected_game.max_participants is not null
    and participant_count >= selected_game.max_participants then
    raise exception 'This game is full';
  end if;

  insert into public.game_participants (game_id, user_id)
  values (p_game_id, p_user_id)
  on conflict (game_id, user_id) do nothing;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  update public.games
  set status = case
    when max_participants is not null and participant_count >= max_participants
      then 'full'::public.game_status
    else 'open'::public.game_status
  end
  where id = p_game_id;
end;
$$;

create or replace function public.service_admin_remove_participant(
  p_game_id uuid,
  p_user_id uuid
)
returns void
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
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('open', 'full') then
    raise exception 'Reset or unarchive the game before changing participants';
  end if;

  delete from public.game_participants
  where game_id = p_game_id and user_id = p_user_id;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  update public.games
  set status = case
    when max_participants is not null and participant_count >= max_participants
      then 'full'::public.game_status
    else 'open'::public.game_status
  end
  where id = p_game_id;
end;
$$;

create or replace function public.service_admin_reset_game(p_game_id uuid)
returns void
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
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('drafted', 'completed') then
    raise exception 'Only an active or completed draw can be reset';
  end if;

  delete from public.tournament_matches where game_id = p_game_id;
  delete from public.randomization_events where game_id = p_game_id;
  update public.game_participants
  set seed_position = null
  where game_id = p_game_id;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  update public.games
  set
    status = case
      when max_participants is not null and participant_count >= max_participants
        then 'full'::public.game_status
      else 'open'::public.game_status
    end,
    randomized_at = null,
    completed_at = null
  where id = p_game_id;
end;
$$;

create or replace function public.service_admin_unarchive_game(p_game_id uuid)
returns public.game_status
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  participant_count integer;
  restored_status public.game_status;
begin
  select * into selected_game
  from public.games
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status <> 'archived' then raise exception 'Game is not archived'; end if;

  select count(*) into participant_count
  from public.game_participants
  where game_id = p_game_id;

  restored_status := case
    when selected_game.completed_at is not null then 'completed'::public.game_status
    when selected_game.randomized_at is not null then 'drafted'::public.game_status
    when selected_game.max_participants is not null
      and participant_count >= selected_game.max_participants then 'full'::public.game_status
    else 'open'::public.game_status
  end;

  update public.games
  set status = restored_status, archived_at = null
  where id = p_game_id;

  return restored_status;
end;
$$;

create or replace function public.service_admin_correct_match_result(
  p_game_id uuid,
  p_match_id uuid,
  p_winner_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  current_match public.tournament_matches;
  downstream_match public.tournament_matches;
  downstream_had_winner boolean;
  target_match_id uuid;
  target_slot text;
  replacement_participant uuid;
begin
  select * into selected_game
  from public.games
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status not in ('drafted', 'completed') then
    raise exception 'Results can only be corrected for an active or completed draw';
  end if;

  select * into current_match
  from public.tournament_matches
  where id = p_match_id and game_id = p_game_id
  for update;

  if current_match.id is null then raise exception 'Match not found'; end if;
  if current_match.status <> 'complete' then raise exception 'Only a completed result can be corrected'; end if;
  if p_winner_id is distinct from current_match.participant_a_id
    and p_winner_id is distinct from current_match.participant_b_id then
    raise exception 'Winner must be a participant in this match';
  end if;

  update public.tournament_matches
  set winner_id = p_winner_id, status = 'complete'
  where id = current_match.id;

  if current_match.next_match_id is null then
    update public.games
    set status = 'completed', completed_at = now()
    where id = p_game_id;
    return;
  end if;

  target_match_id := current_match.next_match_id;
  target_slot := current_match.next_slot;
  replacement_participant := p_winner_id;

  loop
    select * into downstream_match
    from public.tournament_matches
    where id = target_match_id and game_id = p_game_id
    for update;

    if downstream_match.id is null then
      raise exception 'The bracket contains an invalid next match reference';
    end if;

    downstream_had_winner := downstream_match.winner_id is not null;

    if target_slot = 'a' then
      update public.tournament_matches
      set
        participant_a_id = replacement_participant,
        winner_id = null,
        status = case
          when replacement_participant is not null and participant_b_id is not null
            then 'ready'::public.match_status
          else 'pending'::public.match_status
        end
      where id = downstream_match.id;
    else
      update public.tournament_matches
      set
        participant_b_id = replacement_participant,
        winner_id = null,
        status = case
          when participant_a_id is not null and replacement_participant is not null
            then 'ready'::public.match_status
          else 'pending'::public.match_status
        end
      where id = downstream_match.id;
    end if;

    exit when not downstream_had_winner or downstream_match.next_match_id is null;

    target_match_id := downstream_match.next_match_id;
    target_slot := downstream_match.next_slot;
    replacement_participant := null;
  end loop;

  update public.games
  set status = 'drafted', completed_at = null
  where id = p_game_id;
end;
$$;

revoke all on function public.service_admin_update_game(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.service_admin_add_participant(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.service_admin_remove_participant(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.service_admin_reset_game(uuid)
  from public, anon, authenticated;
revoke all on function public.service_admin_unarchive_game(uuid)
  from public, anon, authenticated;
revoke all on function public.service_admin_correct_match_result(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.service_admin_update_game(uuid, text, text, integer)
  to service_role;
grant execute on function public.service_admin_add_participant(uuid, uuid)
  to service_role;
grant execute on function public.service_admin_remove_participant(uuid, uuid)
  to service_role;
grant execute on function public.service_admin_reset_game(uuid)
  to service_role;
grant execute on function public.service_admin_unarchive_game(uuid)
  to service_role;
grant execute on function public.service_admin_correct_match_result(uuid, uuid, uuid)
  to service_role;
