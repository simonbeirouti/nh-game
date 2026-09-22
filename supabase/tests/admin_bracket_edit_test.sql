begin;

select plan(11);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_reseed_participant(uuid,uuid,integer)',
    'execute'
  ),
  'anonymous users cannot reseed a bracket'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_admin_reseed_participant(uuid,uuid,integer)',
    'execute'
  ),
  'authenticated users cannot reseed a bracket'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_reseed_participant(uuid,uuid,integer)',
    'execute'
  ),
  'the service role can reseed a bracket'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.service_admin_update_match_score(uuid,uuid,integer,integer)',
    'execute'
  ),
  'anonymous users cannot update match scores'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_admin_update_match_score(uuid,uuid,integer,integer)',
    'execute'
  ),
  'the service role can update match scores'
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
    ('42000000-0000-4000-8000-000000000001'::uuid, 'bracket-one@example.test'),
    ('42000000-0000-4000-8000-000000000002'::uuid, 'bracket-two@example.test'),
    ('42000000-0000-4000-8000-000000000003'::uuid, 'bracket-three@example.test'),
    ('42000000-0000-4000-8000-000000000004'::uuid, 'bracket-four@example.test')
) as fixture_users(id, email);

insert into public.profiles (id, full_name)
values
  ('42000000-0000-4000-8000-000000000001', 'Bracket One'),
  ('42000000-0000-4000-8000-000000000002', 'Bracket Two'),
  ('42000000-0000-4000-8000-000000000003', 'Bracket Three'),
  ('42000000-0000-4000-8000-000000000004', 'Bracket Four');

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
  '52000000-0000-4000-8000-000000000001',
  'Bracket edit fixture',
  'drafted',
  '42000000-0000-4000-8000-000000000001',
  true,
  4,
  now()
);

insert into public.game_participants (game_id, user_id, seed_position)
select
  '52000000-0000-4000-8000-000000000001',
  user_id,
  seed_position
from (
  values
    ('42000000-0000-4000-8000-000000000001'::uuid, 1),
    ('42000000-0000-4000-8000-000000000002'::uuid, 2),
    ('42000000-0000-4000-8000-000000000003'::uuid, 3),
    ('42000000-0000-4000-8000-000000000004'::uuid, 4)
) as seeded_users(user_id, seed_position);

insert into public.tournament_matches (
  id,
  game_id,
  round,
  slot,
  participant_a_id,
  participant_b_id,
  status
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    1,
    1,
    '42000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000004',
    'ready'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000001',
    1,
    2,
    '42000000-0000-4000-8000-000000000002',
    '42000000-0000-4000-8000-000000000003',
    'ready'
  );

set local role service_role;

select lives_ok(
  $$select public.service_admin_reseed_participant(
    '52000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    4
  )$$,
  'a participant can be dragged across multiple seeds'
);
select results_eq(
  $$select user_id
    from public.game_participants
    where game_id = '52000000-0000-4000-8000-000000000001'
    order by seed_position$$,
  $$values
    ('42000000-0000-4000-8000-000000000002'::uuid),
    ('42000000-0000-4000-8000-000000000003'::uuid),
    ('42000000-0000-4000-8000-000000000004'::uuid),
    ('42000000-0000-4000-8000-000000000001'::uuid)$$,
  'the dragged participant is inserted at the target seed'
);
select results_eq(
  $$select participant_a_id, participant_b_id
    from public.tournament_matches
    where game_id = '52000000-0000-4000-8000-000000000001'
    order by slot$$,
  $$values
    (
      '42000000-0000-4000-8000-000000000002'::uuid,
      '42000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      '42000000-0000-4000-8000-000000000003'::uuid,
      '42000000-0000-4000-8000-000000000004'::uuid
    )$$,
  'opening match slots follow the new seed order'
);
select lives_ok(
  $$select public.service_admin_update_match_score(
    '52000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    11,
    7
  )$$,
  'an admin can record a match score'
);
select results_eq(
  $$select participant_a_score, participant_b_score
    from public.tournament_matches
    where id = '62000000-0000-4000-8000-000000000001'$$,
  $$values (11, 7)$$,
  'both participant scores are stored'
);

update public.tournament_matches
set status = 'complete', winner_id = participant_a_id
where id = '62000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.service_admin_reseed_participant(
    '52000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000002',
    2
  )$$,
  'Seeds cannot be changed after a result is recorded',
  'dragging locks after the first recorded result'
);

select * from finish();
rollback;
