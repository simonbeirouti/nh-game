begin;

select plan(7);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_move_participant(uuid,uuid,text)',
    'execute'
  ),
  'anonymous users cannot reorder a draw'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_move_participant(uuid,uuid,text)',
    'execute'
  ),
  'authenticated users cannot reorder a draw'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_move_participant(uuid,uuid,text)',
    'execute'
  ),
  'the service role can reorder a draw'
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
    ('41000000-0000-4000-8000-000000000001'::uuid, 'reseed-one@example.test'),
    ('41000000-0000-4000-8000-000000000002'::uuid, 'reseed-two@example.test')
) as fixture_users(id, email);

insert into public.profiles (id, full_name)
values
  ('41000000-0000-4000-8000-000000000001', 'Seed One'),
  ('41000000-0000-4000-8000-000000000002', 'Seed Two');

insert into public.games (
  id,
  name,
  status,
  created_by,
  creator_participates,
  max_participants,
  randomized_at
)
values (
  '51000000-0000-4000-8000-000000000001',
  'Reseed fixture',
  'drafted',
  '41000000-0000-4000-8000-000000000001',
  true,
  2,
  now()
);

insert into public.game_participants (game_id, user_id, seed_position)
values
  (
    '51000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001',
    1
  ),
  (
    '51000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000002',
    2
  );

insert into public.tournament_matches (
  id,
  game_id,
  round,
  slot,
  participant_a_id,
  participant_b_id,
  status
)
values (
  '61000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  1,
  1,
  '41000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000002',
  'ready'
);

set local role service_role;

select lives_ok(
  $$select public.service_admin_move_participant(
    '51000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001',
    'down'
  )$$,
  'an admin can move a seed before results begin'
);
select results_eq(
  $$select user_id
    from public.game_participants
    where game_id = '51000000-0000-4000-8000-000000000001'
    order by seed_position$$,
  $$values
    ('41000000-0000-4000-8000-000000000002'::uuid),
    ('41000000-0000-4000-8000-000000000001'::uuid)$$,
  'seed positions are swapped'
);
select results_eq(
  $$select participant_a_id, participant_b_id
    from public.tournament_matches
    where id = '61000000-0000-4000-8000-000000000001'$$,
  $$values (
    '41000000-0000-4000-8000-000000000002'::uuid,
    '41000000-0000-4000-8000-000000000001'::uuid
  )$$,
  'the opening matchup follows the new seed order'
);

update public.tournament_matches
set status = 'complete', winner_id = participant_a_id
where id = '61000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.service_admin_move_participant(
    '51000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000002',
    'down'
  )$$,
  'Seeds cannot be changed after a result is recorded',
  'seeds lock after the first recorded result'
);

select * from finish();
rollback;
