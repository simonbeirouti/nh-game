create policy "authenticated users receive game invalidations"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    (select realtime.topic()) = 'games:public'
    or (select realtime.topic()) = 'user:' || (select auth.uid())::text
  )
);

create or replace function private.send_game_invalidation(
  p_topic text,
  p_entity text,
  p_operation text,
  p_game_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'entity', p_entity,
      'operation', p_operation,
      'gameId', p_game_id
    ),
    'invalidate',
    p_topic,
    true
  );
end;
$$;

create or replace function private.send_game_invalidation_to_recipients(
  p_game_id uuid,
  p_entity text,
  p_operation text,
  p_extra_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
begin
  for recipient_id in
    select recipient.user_id
    from (
      select g.created_by as user_id
      from public.games g
      where g.id = p_game_id

      union

      select gp.user_id
      from public.game_participants gp
      where gp.game_id = p_game_id

      union

      select ur.user_id
      from public.user_roles ur
      where ur.role = 'admin'

      union

      select p_extra_user_id
      where p_extra_user_id is not null
    ) recipient
  loop
    perform private.send_game_invalidation(
      'user:' || recipient_id::text,
      p_entity,
      p_operation,
      p_game_id
    );
  end loop;
end;
$$;

create or replace function private.broadcast_game_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  if (tg_op = 'DELETE' and old.status = 'open')
    or (tg_op = 'INSERT' and new.status = 'open')
    or (
      tg_op = 'UPDATE'
      and (old.status = 'open' or new.status = 'open')
    ) then
    perform private.send_game_invalidation(
      'games:public',
      'game',
      tg_op,
      game_id
    );
  end if;

  perform private.send_game_invalidation_to_recipients(
    game_id,
    'game',
    tg_op,
    case when tg_op = 'DELETE' then old.created_by else new.created_by end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.broadcast_participant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant record := case when tg_op = 'DELETE' then old else new end;
  game_is_public boolean;
begin
  select g.status = 'open'
  into game_is_public
  from public.games g
  where g.id = participant.game_id;

  if coalesce(game_is_public, false) then
    perform private.send_game_invalidation(
      'games:public',
      'participant',
      tg_op,
      participant.game_id
    );
  end if;

  perform private.send_game_invalidation_to_recipients(
    participant.game_id,
    'participant',
    tg_op,
    participant.user_id
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.broadcast_match_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row record := case when tg_op = 'DELETE' then old else new end;
begin
  perform private.send_game_invalidation_to_recipients(
    match_row.game_id,
    'match',
    tg_op
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.broadcast_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  related_game_id uuid;
begin
  for related_game_id in
    select distinct gp.game_id
    from public.game_participants gp
    where gp.user_id = new.id
  loop
    perform private.send_game_invalidation_to_recipients(
      related_game_id,
      'profile',
      tg_op,
      new.id
    );
  end loop;
  return new;
end;
$$;

revoke execute on function private.send_game_invalidation(text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.send_game_invalidation_to_recipients(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.broadcast_game_change()
  from public, anon, authenticated, service_role;
revoke execute on function private.broadcast_participant_change()
  from public, anon, authenticated, service_role;
revoke execute on function private.broadcast_match_change()
  from public, anon, authenticated, service_role;
revoke execute on function private.broadcast_profile_change()
  from public, anon, authenticated, service_role;

create trigger games_broadcast_invalidation
before insert or update or delete on public.games
for each row execute function private.broadcast_game_change();

create trigger participants_broadcast_invalidation
after insert or update or delete on public.game_participants
for each row execute function private.broadcast_participant_change();

create trigger matches_broadcast_invalidation
after insert or update or delete on public.tournament_matches
for each row execute function private.broadcast_match_change();

create trigger profiles_broadcast_invalidation
after update of full_name, avatar_url on public.profiles
for each row
when (
  old.full_name is distinct from new.full_name
  or old.avatar_url is distinct from new.avatar_url
)
execute function private.broadcast_profile_change();
