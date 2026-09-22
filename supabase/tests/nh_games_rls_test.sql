begin;

select plan(43);

-- Keep the security fixtures isolated from the development seed data. The
-- surrounding transaction rolls these deletions back after the test.
delete from public.games;
delete from public.user_roles;
delete from auth.users;

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'games', 'games exists');
select has_table('public', 'game_participants', 'participants exists');
select has_table('public', 'tournament_matches', 'matches exists');
select has_table('public', 'randomization_events', 'randomization events exist');
select has_table('public', 'push_subscriptions', 'push subscriptions exist');
select has_table('public', 'user_roles', 'user roles exist');

select ok(relrowsecurity, relname || ' has RLS enabled')
from pg_class
where oid in (
  'public.profiles'::regclass,
  'public.games'::regclass,
  'public.game_participants'::regclass,
  'public.tournament_matches'::regclass,
  'public.randomization_events'::regclass,
  'public.push_subscriptions'::regclass,
  'public.user_roles'::regclass
)
order by relname;

select ok(
  not has_table_privilege('anon', 'public.games', 'select'),
  'anonymous users cannot read games'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anonymous users cannot read profiles'
);
select ok(
  not has_table_privilege('anon', 'public.user_roles', 'select'),
  'anonymous users cannot read roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'select'),
  'authenticated users cannot read roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'insert'),
  'authenticated users cannot assign roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'update'),
  'authenticated users cannot change roles'
);
select ok(
  has_table_privilege(
    'service_role',
    'public.user_roles',
    'select,insert,update,delete'
  ),
  'service role can manage roles'
);
select hasnt_column(
  'public',
  'profiles',
  'email',
  'profiles do not expose auth email addresses'
);
select ok(
  has_table_privilege('authenticated', 'public.push_subscriptions', 'select,insert,update,delete'),
  'authenticated users have subscription operations gated by RLS'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_create_game(uuid,text,text,integer,boolean)',
    'execute'
  ),
  'authenticated clients cannot execute service RPCs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_create_game(uuid,text,text,integer,boolean)',
    'execute'
  ),
  'service role can execute service RPCs'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_bootstrap_admin(uuid)',
    'execute'
  ),
  'authenticated users cannot execute the admin bootstrap RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_bootstrap_admin(uuid)',
    'execute'
  ),
  'service role can execute the admin bootstrap RPC'
);
select ok(
  has_table_privilege('service_role', 'public.profiles', 'select,insert,update'),
  'service role can maintain profiles through server actions'
);
select ok(
  has_table_privilege('service_role', 'public.games', 'select,insert,update,delete'),
  'service role can manage games through server actions'
);
select results_eq(
  $$select id from storage.buckets where id = 'avatars'$$,
  array['avatars'::text],
  'the public avatar bucket exists'
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
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'member@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'unrelated@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values
  ('10000000-0000-4000-8000-000000000001', 'Owner'),
  ('10000000-0000-4000-8000-000000000002', 'Member'),
  ('10000000-0000-4000-8000-000000000003', 'Unrelated');

set local role service_role;
select is(
  public.service_bootstrap_admin(
    '10000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'the configured user can bootstrap the first admin role'
);
select is(
  public.service_bootstrap_admin(
    '10000000-0000-4000-8000-000000000002'::uuid
  ),
  false,
  'admin bootstrap is disabled after the first role exists'
);
select results_eq(
  $$select user_id from public.user_roles order by user_id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'the database keeps the first administrator authoritative'
);
delete from public.user_roles;
select lives_ok(
  $$
    insert into public.user_roles (user_id, role)
    values ('10000000-0000-4000-8000-000000000001', 'admin');
    update public.user_roles
    set role = 'admin'
    where user_id = '10000000-0000-4000-8000-000000000001';
    delete from public.user_roles
    where user_id = '10000000-0000-4000-8000-000000000001';
  $$,
  'service role can insert, update, and delete roles'
);
select lives_ok(
  $$select public.service_create_game(
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Member-created game',
    '',
    null,
    false
  )$$,
  'an authenticated member can create a game through the server action RPC'
);
delete from public.games where name = 'Member-created game';
reset role;

insert into public.games (
  id,
  name,
  created_by,
  creator_participates,
  invite_token
)
values (
  '20000000-0000-4000-8000-000000000001',
  'Private game',
  '10000000-0000-4000-8000-000000000001',
  true,
  '30000000-0000-4000-8000-000000000001'
);

insert into public.game_participants (game_id, user_id)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'https://push.example.test/owner',
    'owner-key',
    'owner-auth'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'https://push.example.test/member',
    'member-key',
    'member-auth'
  );

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select results_eq(
  'select id from public.games order by id',
  array['20000000-0000-4000-8000-000000000001'::uuid],
  'the creator can read their game'
);
select results_eq(
  'select id from public.profiles order by id',
  array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  ],
  'the creator can read profiles shared through a game'
);
select results_eq(
  'select endpoint from public.push_subscriptions order by endpoint',
  array['https://push.example.test/owner'::text],
  'subscription reads are owner-only'
);
select results_eq(
  $$update public.profiles set full_name = 'Owner updated' returning id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'profile updates affect only the current user'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select results_eq(
  'select id from public.games order by id',
  array['20000000-0000-4000-8000-000000000001'::uuid],
  'a participant can read a shared game'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select is_empty(
  'select id from public.games',
  'an unrelated user cannot read the game'
);
select results_eq(
  'select id from public.profiles order by id',
  array['10000000-0000-4000-8000-000000000003'::uuid],
  'an unrelated user can read only their own profile'
);
select is_empty(
  'select endpoint from public.push_subscriptions',
  'an unrelated user cannot read another subscription'
);

reset role;

select * from finish();
rollback;
