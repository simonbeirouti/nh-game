begin;

select plan(36);

delete from public.games;
delete from public.user_roles;
delete from auth.users;

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_update_game(uuid,text,text,integer)',
    'execute'
  ),
  'anonymous users cannot update games through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_update_game(uuid,text,text,integer)',
    'execute'
  ),
  'authenticated users cannot update games through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_update_game(uuid,text,text,integer)',
    'execute'
  ),
  'the service role can update games through the admin RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_add_participant(uuid,uuid)',
    'execute'
  ),
  'anonymous users cannot add participants through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_add_participant(uuid,uuid)',
    'execute'
  ),
  'authenticated users cannot add participants through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_add_participant(uuid,uuid)',
    'execute'
  ),
  'the service role can add participants through the admin RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_remove_participant(uuid,uuid)',
    'execute'
  ),
  'anonymous users cannot remove participants through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_remove_participant(uuid,uuid)',
    'execute'
  ),
  'authenticated users cannot remove participants through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_remove_participant(uuid,uuid)',
    'execute'
  ),
  'the service role can remove participants through the admin RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_reset_game(uuid)',
    'execute'
  ),
  'anonymous users cannot reset draws through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_reset_game(uuid)',
    'execute'
  ),
  'authenticated users cannot reset draws through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_reset_game(uuid)',
    'execute'
  ),
  'the service role can reset draws through the admin RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_unarchive_game(uuid)',
    'execute'
  ),
  'anonymous users cannot unarchive games through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_unarchive_game(uuid)',
    'execute'
  ),
  'authenticated users cannot unarchive games through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_unarchive_game(uuid)',
    'execute'
  ),
  'the service role can unarchive games through the admin RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_correct_match_result(uuid,uuid,uuid)',
    'execute'
  ),
  'anonymous users cannot correct results through the admin RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_correct_match_result(uuid,uuid,uuid)',
    'execute'
  ),
  'authenticated users cannot correct results through the admin RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_correct_match_result(uuid,uuid,uuid)',
    'execute'
  ),
  'the service role can correct results through the admin RPC'
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
select
  id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  email,
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
from (
  values
    ('40000000-0000-4000-8000-000000000001'::uuid, 'admin-one@example.test'),
    ('40000000-0000-4000-8000-000000000002'::uuid, 'player-two@example.test'),
    ('40000000-0000-4000-8000-000000000003'::uuid, 'player-three@example.test'),
    ('40000000-0000-4000-8000-000000000004'::uuid, 'player-four@example.test')
) as fixture_users(id, email);

insert into public.profiles (id, full_name)
values
  ('40000000-0000-4000-8000-000000000001', 'Admin One'),
  ('40000000-0000-4000-8000-000000000002', 'Player Two'),
  ('40000000-0000-4000-8000-000000000003', 'Player Three'),
  ('40000000-0000-4000-8000-000000000004', 'Player Four');

insert into public.games (
  id,
  name,
  status,
  created_by,
  creator_participates,
  max_participants
)
values (
  '50000000-0000-4000-8000-000000000001',
  'Admin lifecycle fixture',
  'open',
  '40000000-0000-4000-8000-000000000001',
  true,
  null
);

insert into public.game_participants (game_id, user_id)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001'
);

set local role service_role;

select lives_ok(
  $$select public.service_admin_add_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002'
  )$$,
  'an active user can be added to an open game'
);
select lives_ok(
  $$select public.service_admin_add_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003'
  )$$,
  'participant additions are allowed while capacity is unlimited'
);
select throws_ok(
  $$select public.service_admin_update_game(
    '50000000-0000-4000-8000-000000000001',
    'Admin lifecycle fixture',
    '',
    2
  )$$,
  'Participant limit cannot be lower than the current participant count',
  'metadata updates reject a participant limit below current occupancy'
);
select lives_ok(
  $$select public.service_admin_update_game(
    '50000000-0000-4000-8000-000000000001',
    'Renamed admin fixture',
    'Managed by the administrator.',
    3
  )$$,
  'valid metadata changes are accepted'
);
select is(
  (select status::text from public.games where id = '50000000-0000-4000-8000-000000000001'),
  'full',
  'setting capacity to the participant count marks the game full'
);
select throws_ok(
  $$select public.service_admin_add_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000004'
  )$$,
  'This game is full',
  'a participant cannot be added above capacity'
);
select lives_ok(
  $$select public.service_admin_remove_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003'
  )$$,
  'participants can be removed from a full game'
);
select is(
  (select status::text from public.games where id = '50000000-0000-4000-8000-000000000001'),
  'open',
  'removing a participant below capacity reopens the game'
);
select lives_ok(
  $$select public.service_admin_add_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003'
  )$$,
  'the removed participant can be added again'
);

update public.games
set status = 'drafted', randomized_at = now(), max_participants = 4
where id = '50000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.service_admin_remove_participant(
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003'
  )$$,
  'Reset or unarchive the game before changing participants',
  'participants cannot change once the draw is locked'
);

insert into public.game_participants (game_id, user_id, seed_position)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000004',
  4
);
update public.game_participants
set seed_position = case user_id
  when '40000000-0000-4000-8000-000000000001' then 1
  when '40000000-0000-4000-8000-000000000002' then 2
  when '40000000-0000-4000-8000-000000000003' then 3
end
where game_id = '50000000-0000-4000-8000-000000000001'
  and user_id <> '40000000-0000-4000-8000-000000000004';

insert into public.tournament_matches (
  id,
  game_id,
  round,
  slot,
  participant_a_id,
  participant_b_id,
  winner_id,
  status,
  next_match_id,
  next_slot
)
values
  (
    '60000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000001',
    2,
    1,
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000001',
    'complete',
    null,
    null
  ),
  (
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    1,
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    'complete',
    '60000000-0000-4000-8000-000000000003',
    'a'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000001',
    1,
    2,
    '40000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000003',
    'complete',
    '60000000-0000-4000-8000-000000000003',
    'b'
  );

update public.games
set status = 'completed', completed_at = now()
where id = '50000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.service_admin_correct_match_result(
    '50000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002'
  )$$,
  'a completed result can be corrected'
);
select results_eq(
  $$select participant_a_id, participant_b_id, winner_id, status::text
    from public.tournament_matches
    where id = '60000000-0000-4000-8000-000000000003'$$,
  $$values (
    '40000000-0000-4000-8000-000000000002'::uuid,
    '40000000-0000-4000-8000-000000000003'::uuid,
    null::uuid,
    'ready'::text
  )$$,
  'correction replaces the dependent slot and clears its result'
);
select is(
  (select winner_id from public.tournament_matches where id = '60000000-0000-4000-8000-000000000002'),
  '40000000-0000-4000-8000-000000000003'::uuid,
  'the unaffected bracket branch keeps its result'
);
select results_eq(
  $$select status::text, completed_at is null
    from public.games
    where id = '50000000-0000-4000-8000-000000000001'$$,
  $$values ('drafted'::text, true)$$,
  'correcting a non-final match returns the game to drafted'
);

insert into public.randomization_events (
  game_id,
  algorithm_version,
  seed,
  participant_snapshot,
  ordered_participant_ids,
  order_hash,
  triggered_by
)
values (
  '50000000-0000-4000-8000-000000000001',
  'test-v1',
  'fixture-seed',
  array[
    '40000000-0000-4000-8000-000000000001'::uuid,
    '40000000-0000-4000-8000-000000000002'::uuid,
    '40000000-0000-4000-8000-000000000003'::uuid,
    '40000000-0000-4000-8000-000000000004'::uuid
  ],
  array[
    '40000000-0000-4000-8000-000000000001'::uuid,
    '40000000-0000-4000-8000-000000000002'::uuid,
    '40000000-0000-4000-8000-000000000003'::uuid,
    '40000000-0000-4000-8000-000000000004'::uuid
  ],
  'fixture-hash',
  '40000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$select public.service_admin_reset_game(
    '50000000-0000-4000-8000-000000000001'
  )$$,
  'a drafted game can be reset'
);
select results_eq(
  $$select
      status::text,
      randomized_at is null,
      completed_at is null,
      (select count(*) from public.tournament_matches where game_id = games.id),
      (select count(*) from public.randomization_events where game_id = games.id),
      (select count(*) from public.game_participants where game_id = games.id and seed_position is not null)
    from public.games
    where id = '50000000-0000-4000-8000-000000000001'$$,
  $$values ('full'::text, true, true, 0::bigint, 0::bigint, 0::bigint)$$,
  'reset removes bracket data, randomization data, seeds, and timestamps'
);

update public.games
set status = 'archived', archived_at = now()
where id = '50000000-0000-4000-8000-000000000001';
select is(
  public.service_admin_unarchive_game('50000000-0000-4000-8000-000000000001')::text,
  'full',
  'unarchive derives full from retained capacity and occupancy'
);

update public.games
set status = 'archived', archived_at = now(), completed_at = now()
where id = '50000000-0000-4000-8000-000000000001';
select is(
  public.service_admin_unarchive_game('50000000-0000-4000-8000-000000000001')::text,
  'completed',
  'unarchive restores completed games from their completion timestamp'
);

select * from finish();
rollback;
