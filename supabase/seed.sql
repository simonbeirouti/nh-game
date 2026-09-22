-- Deterministic local development fixtures.
-- Loaded automatically after migrations by `supabase db reset --local`.

with seed_users as (
  select
    number,
    ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid as id,
    case
      when number = 1 then 'hello@simonbeirouti.com'
      else 'player' || lpad(number::text, 2, '0') || '@example.com'
    end as email,
    (array[
      'Simon Beirouti', 'Ava Nguyen', 'Noah Williams', 'Mia Chen',
      'Liam Patel', 'Isla Thompson', 'Ethan Garcia', 'Zoe Martin',
      'Lucas Brown', 'Ruby Wilson', 'Oliver Taylor', 'Chloe Anderson',
      'Jack Thomas', 'Grace Moore', 'Henry Jackson', 'Sophie White',
      'Leo Harris', 'Amelia Clark', 'Oscar Lewis', 'Evie Walker'
    ])[number] as full_name
  from generate_series(1, 20) as number
)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
select
  id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  email,
  '',
  now(),
  '',
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', full_name),
  false,
  now() - interval '90 days' + number * interval '1 hour',
  now()
from seed_users;

with seed_users as (
  select
    ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid as user_id,
    case
      when number = 1 then 'hello@simonbeirouti.com'
      else 'player' || lpad(number::text, 2, '0') || '@example.com'
    end as email
  from generate_series(1, 20) as number
)
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  ('10000000-0000-4000-8000-' || right(user_id::text, 12))::uuid,
  user_id::text,
  user_id,
  jsonb_build_object(
    'sub', user_id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from seed_users;

with seed_users as (
  select
    ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid as id,
    (array[
      'Simon Beirouti', 'Ava Nguyen', 'Noah Williams', 'Mia Chen',
      'Liam Patel', 'Isla Thompson', 'Ethan Garcia', 'Zoe Martin',
      'Lucas Brown', 'Ruby Wilson', 'Oliver Taylor', 'Chloe Anderson',
      'Jack Thomas', 'Grace Moore', 'Henry Jackson', 'Sophie White',
      'Leo Harris', 'Amelia Clark', 'Oscar Lewis', 'Evie Walker'
    ])[number] as full_name
  from generate_series(1, 20) as number
)
insert into public.profiles (id, full_name, created_at, updated_at)
select id, full_name, now() - interval '90 days', now()
from seed_users;

insert into public.user_roles (user_id, role)
values ('00000000-0000-4000-8000-000000000001', 'admin');

insert into public.games (
  id,
  name,
  description,
  status,
  created_by,
  creator_participates,
  max_participants,
  invite_token,
  randomized_at,
  completed_at,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Friday Night Knockout',
    'A casual end-of-week tournament with room for two more players.',
    'open',
    '00000000-0000-4000-8000-000000000001',
    true,
    8,
    '30000000-0000-4000-8000-000000000001',
    null,
    null,
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Table Tennis Cup',
    'Eight players are locked in and waiting for the draw.',
    'full',
    '00000000-0000-4000-8000-000000000007',
    true,
    8,
    '30000000-0000-4000-8000-000000000002',
    null,
    null,
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Office Chess Championship',
    'The quarter-finals are ready to play.',
    'drafted',
    '00000000-0000-4000-8000-000000000003',
    true,
    8,
    '30000000-0000-4000-8000-000000000003',
    now() - interval '3 hours',
    null,
    now() - interval '8 days',
    now() - interval '3 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Spring Social Games',
    'An open bracket for the next team social.',
    'open',
    '00000000-0000-4000-8000-000000000005',
    true,
    16,
    '30000000-0000-4000-8000-000000000004',
    null,
    null,
    now() - interval '10 hours',
    now() - interval '10 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Summer Singles Final',
    'A completed eight-player tournament won by Simon.',
    'completed',
    '00000000-0000-4000-8000-000000000001',
    true,
    8,
    '30000000-0000-4000-8000-000000000005',
    now() - interval '15 days',
    now() - interval '14 days',
    now() - interval '20 days',
    now() - interval '14 days'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'Autumn Arcade Classic',
    'A completed bracket featuring the second half of the player roster.',
    'completed',
    '00000000-0000-4000-8000-000000000009',
    true,
    8,
    '30000000-0000-4000-8000-000000000006',
    now() - interval '30 days',
    now() - interval '29 days',
    now() - interval '35 days',
    now() - interval '29 days'
  );

insert into public.game_participants (game_id, user_id, seed_position, joined_at)
select
  '20000000-0000-4000-8000-000000000001'::uuid,
  ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  null::integer,
  now() - interval '2 days' + number * interval '20 minutes'
from generate_series(1, 6) as number
union all
select
  '20000000-0000-4000-8000-000000000002'::uuid,
  ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  null::integer,
  now() - interval '5 days' + number * interval '30 minutes'
from generate_series(7, 14) as number
union all
select
  '20000000-0000-4000-8000-000000000003'::uuid,
  participant_id,
  seed_position,
  now() - interval '8 days' + seed_position * interval '1 hour'
from (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 1),
    ('00000000-0000-4000-8000-000000000002'::uuid, 2),
    ('00000000-0000-4000-8000-000000000003'::uuid, 3),
    ('00000000-0000-4000-8000-000000000004'::uuid, 4),
    ('00000000-0000-4000-8000-000000000009'::uuid, 5),
    ('00000000-0000-4000-8000-000000000010'::uuid, 6),
    ('00000000-0000-4000-8000-000000000015'::uuid, 7),
    ('00000000-0000-4000-8000-000000000016'::uuid, 8)
) as drafted(participant_id, seed_position)
union all
select
  '20000000-0000-4000-8000-000000000004'::uuid,
  ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  null::integer,
  now() - interval '10 hours' + number * interval '15 minutes'
from unnest(array[5, 6, 11, 12, 17]) as number
union all
select
  '20000000-0000-4000-8000-000000000005'::uuid,
  ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  number,
  now() - interval '20 days' + number * interval '1 hour'
from generate_series(1, 8) as number
union all
select
  '20000000-0000-4000-8000-000000000006'::uuid,
  ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  number - 8,
  now() - interval '35 days' + number * interval '1 hour'
from generate_series(9, 16) as number;

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
  next_slot,
  created_at,
  updated_at
)
values
  -- In-progress chess bracket.
  ('40000000-0000-4000-8000-000000000301', '20000000-0000-4000-8000-000000000003', 1, 1, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000016', null, 'ready', '40000000-0000-4000-8000-000000000305', 'a', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000302', '20000000-0000-4000-8000-000000000003', 1, 2, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000009', null, 'ready', '40000000-0000-4000-8000-000000000305', 'b', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000303', '20000000-0000-4000-8000-000000000003', 1, 3, '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000015', null, 'ready', '40000000-0000-4000-8000-000000000306', 'a', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000304', '20000000-0000-4000-8000-000000000003', 1, 4, '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010', null, 'ready', '40000000-0000-4000-8000-000000000306', 'b', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000305', '20000000-0000-4000-8000-000000000003', 2, 1, null, null, null, 'pending', '40000000-0000-4000-8000-000000000307', 'a', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000306', '20000000-0000-4000-8000-000000000003', 2, 2, null, null, null, 'pending', '40000000-0000-4000-8000-000000000307', 'b', now() - interval '3 hours', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000307', '20000000-0000-4000-8000-000000000003', 3, 1, null, null, null, 'pending', null, null, now() - interval '3 hours', now() - interval '3 hours'),
  -- Completed summer bracket.
  ('40000000-0000-4000-8000-000000000501', '20000000-0000-4000-8000-000000000005', 1, 1, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'complete', '40000000-0000-4000-8000-000000000505', 'a', now() - interval '15 days', now() - interval '15 days'),
  ('40000000-0000-4000-8000-000000000502', '20000000-0000-4000-8000-000000000005', 1, 2, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'complete', '40000000-0000-4000-8000-000000000505', 'b', now() - interval '15 days', now() - interval '15 days'),
  ('40000000-0000-4000-8000-000000000503', '20000000-0000-4000-8000-000000000005', 1, 3, '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000002', 'complete', '40000000-0000-4000-8000-000000000506', 'a', now() - interval '15 days', now() - interval '15 days'),
  ('40000000-0000-4000-8000-000000000504', '20000000-0000-4000-8000-000000000005', 1, 4, '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003', 'complete', '40000000-0000-4000-8000-000000000506', 'b', now() - interval '15 days', now() - interval '15 days'),
  ('40000000-0000-4000-8000-000000000505', '20000000-0000-4000-8000-000000000005', 2, 1, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'complete', '40000000-0000-4000-8000-000000000507', 'a', now() - interval '14 days 12 hours', now() - interval '14 days 12 hours'),
  ('40000000-0000-4000-8000-000000000506', '20000000-0000-4000-8000-000000000005', 2, 2, '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'complete', '40000000-0000-4000-8000-000000000507', 'b', now() - interval '14 days 12 hours', now() - interval '14 days 12 hours'),
  ('40000000-0000-4000-8000-000000000507', '20000000-0000-4000-8000-000000000005', 3, 1, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'complete', null, null, now() - interval '14 days', now() - interval '14 days'),
  -- Completed arcade bracket.
  ('40000000-0000-4000-8000-000000000601', '20000000-0000-4000-8000-000000000006', 1, 1, '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000016', 'complete', '40000000-0000-4000-8000-000000000605', 'a', now() - interval '30 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000602', '20000000-0000-4000-8000-000000000006', 1, 2, '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000012', 'complete', '40000000-0000-4000-8000-000000000605', 'b', now() - interval '30 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000603', '20000000-0000-4000-8000-000000000006', 1, 3, '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000010', 'complete', '40000000-0000-4000-8000-000000000606', 'a', now() - interval '30 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000604', '20000000-0000-4000-8000-000000000006', 1, 4, '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000014', 'complete', '40000000-0000-4000-8000-000000000606', 'b', now() - interval '30 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000605', '20000000-0000-4000-8000-000000000006', 2, 1, '00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000016', 'complete', '40000000-0000-4000-8000-000000000607', 'a', now() - interval '29 days 12 hours', now() - interval '29 days 12 hours'),
  ('40000000-0000-4000-8000-000000000606', '20000000-0000-4000-8000-000000000006', 2, 2, '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000014', 'complete', '40000000-0000-4000-8000-000000000607', 'b', now() - interval '29 days 12 hours', now() - interval '29 days 12 hours'),
  ('40000000-0000-4000-8000-000000000607', '20000000-0000-4000-8000-000000000006', 3, 1, '00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000016', 'complete', null, null, now() - interval '29 days', now() - interval '29 days');

insert into public.randomization_events (
  game_id,
  algorithm_version,
  seed,
  participant_snapshot,
  ordered_participant_ids,
  order_hash,
  triggered_by,
  created_at
)
values
  (
    '20000000-0000-4000-8000-000000000003',
    'sha256-sort-v1',
    'seeded-chess-bracket',
    array[
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-4000-8000-000000000004'::uuid,
      '00000000-0000-4000-8000-000000000009'::uuid,
      '00000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000015'::uuid,
      '00000000-0000-4000-8000-000000000016'::uuid
    ],
    array[
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-4000-8000-000000000004'::uuid,
      '00000000-0000-4000-8000-000000000009'::uuid,
      '00000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000015'::uuid,
      '00000000-0000-4000-8000-000000000016'::uuid
    ],
    repeat('3', 64),
    '00000000-0000-4000-8000-000000000003',
    now() - interval '3 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'sha256-sort-v1',
    'seeded-summer-bracket',
    array(select ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid from generate_series(1, 8) as number),
    array(select ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid from generate_series(1, 8) as number),
    repeat('5', 64),
    '00000000-0000-4000-8000-000000000001',
    now() - interval '15 days'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'sha256-sort-v1',
    'seeded-arcade-bracket',
    array(select ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid from generate_series(9, 16) as number),
    array(select ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid from generate_series(9, 16) as number),
    repeat('6', 64),
    '00000000-0000-4000-8000-000000000009',
    now() - interval '30 days'
  );
