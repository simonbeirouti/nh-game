begin;

select plan(11);

select has_trigger(
  'public',
  'games',
  'games_broadcast_invalidation',
  'games broadcast invalidations'
);
select has_trigger(
  'public',
  'game_participants',
  'participants_broadcast_invalidation',
  'participant changes broadcast invalidations'
);
select has_trigger(
  'public',
  'tournament_matches',
  'matches_broadcast_invalidation',
  'match changes broadcast invalidations'
);
select has_trigger(
  'public',
  'profiles',
  'profiles_broadcast_invalidation',
  'profile changes broadcast invalidations'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.send_game_invalidation(text,text,text,uuid)',
    'execute'
  ),
  'authenticated clients cannot call the broadcast helper'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'authenticated users receive game invalidations'
      and roles = array['authenticated'::name]
      and cmd = 'SELECT'
      and qual like '%games:public%'
      and qual like '%user:%'
  ),
  1::bigint,
  'Realtime RLS permits only the public catalog and current user topics'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'realtime-owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'realtime-member@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values
  ('91000000-0000-4000-8000-000000000001', 'Realtime Owner'),
  ('91000000-0000-4000-8000-000000000002', 'Realtime Member');

insert into public.games (
  id,
  name,
  status,
  created_by,
  creator_participates,
  invite_token
)
values (
  '92000000-0000-4000-8000-000000000001',
  'Realtime game',
  'open',
  '91000000-0000-4000-8000-000000000001',
  false,
  '93000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)
    from realtime.messages
    where topic = 'games:public'
      and event = 'invalidate'
      and payload->>'gameId' = '92000000-0000-4000-8000-000000000001'
      and payload->>'entity' = 'game'
      and payload->>'operation' = 'INSERT'
  ),
  1::bigint,
  'an open game invalidates the authenticated public catalog'
);

select is(
  (
    select count(*)
    from realtime.messages
    where topic = 'user:91000000-0000-4000-8000-000000000001'
      and event = 'invalidate'
      and payload->>'gameId' = '92000000-0000-4000-8000-000000000001'
      and payload->>'entity' = 'game'
  ),
  1::bigint,
  'the game owner receives a private invalidation'
);

select is(
  (
    select count(*)
    from jsonb_object_keys(
      (
        select payload
        from realtime.messages
        where topic = 'games:public'
          and payload->>'gameId' = '92000000-0000-4000-8000-000000000001'
        order by inserted_at desc
        limit 1
      )
    )
  ),
  4::bigint,
  'broadcast payloads contain only invalidation fields and the Supabase message id'
);

insert into public.game_participants (game_id, user_id)
values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002'
);
delete from public.game_participants
where game_id = '92000000-0000-4000-8000-000000000001'
  and user_id = '91000000-0000-4000-8000-000000000002';

select is(
  (
    select count(*)
    from realtime.messages
    where topic = 'user:91000000-0000-4000-8000-000000000002'
      and payload->>'gameId' = '92000000-0000-4000-8000-000000000001'
      and payload->>'entity' = 'participant'
      and payload->>'operation' = 'DELETE'
  ),
  1::bigint,
  'a removed participant receives the final private invalidation'
);

select is(
  (
    select count(*)
    from realtime.messages
    where topic = 'games:public'
      and payload->>'gameId' = '92000000-0000-4000-8000-000000000001'
      and payload->>'entity' = 'participant'
      and payload->>'operation' in ('INSERT', 'DELETE')
  ),
  2::bigint,
  'open-game participant changes invalidate the public catalog'
);

select * from finish();
rollback;
