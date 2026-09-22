create or replace function public.service_admin_move_participant(
  p_game_id uuid,
  p_user_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_game public.games;
  current_seed integer;
  target_seed integer;
  target_user_id uuid;
begin
  select * into selected_game
  from public.games
  where id = p_game_id
  for update;

  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.status <> 'drafted' then
    raise exception 'Seeds can only be changed for an active draw';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down';
  end if;
  if exists (
    select 1
    from public.tournament_matches
    where game_id = p_game_id and status = 'complete'
  ) then
    raise exception 'Seeds cannot be changed after a result is recorded';
  end if;

  select seed_position into current_seed
  from public.game_participants
  where game_id = p_game_id and user_id = p_user_id
  for update;

  if current_seed is null then raise exception 'Seeded participant not found'; end if;

  target_seed := current_seed + case when p_direction = 'up' then -1 else 1 end;

  select user_id into target_user_id
  from public.game_participants
  where game_id = p_game_id and seed_position = target_seed
  for update;

  if target_user_id is null then raise exception 'Participant cannot move further'; end if;

  update public.game_participants
  set seed_position = null
  where game_id = p_game_id and user_id in (p_user_id, target_user_id);

  update public.game_participants
  set seed_position = case
    when user_id = p_user_id then target_seed
    else current_seed
  end
  where game_id = p_game_id and user_id in (p_user_id, target_user_id);

  update public.tournament_matches
  set
    participant_a_id = case
      when participant_a_id = p_user_id then target_user_id
      when participant_a_id = target_user_id then p_user_id
      else participant_a_id
    end,
    participant_b_id = case
      when participant_b_id = p_user_id then target_user_id
      when participant_b_id = target_user_id then p_user_id
      else participant_b_id
    end,
    winner_id = case
      when winner_id = p_user_id then target_user_id
      when winner_id = target_user_id then p_user_id
      else winner_id
    end
  where game_id = p_game_id
    and (
      participant_a_id in (p_user_id, target_user_id)
      or participant_b_id in (p_user_id, target_user_id)
      or winner_id in (p_user_id, target_user_id)
    );

  update public.games set updated_at = now() where id = p_game_id;
end;
$$;

revoke all on function public.service_admin_move_participant(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.service_admin_move_participant(uuid, uuid, text)
  to service_role;
