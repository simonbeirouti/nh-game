begin;

select plan(8);

select is(
  (
    select count(*)
    from auth.users
    where id::text like '00000000-0000-4000-8000-%'
  ),
  20::bigint,
  'seed contains 20 authentication users'
);
select is(
  (
    select count(*)
    from auth.identities
    where provider = 'email'
      and user_id::text like '00000000-0000-4000-8000-%'
  ),
  20::bigint,
  'every seeded user has an email identity'
);
select is(
  (
    select count(*)
    from public.profiles
    where id::text like '00000000-0000-4000-8000-%'
  ),
  20::bigint,
  'seed contains 20 application profiles'
);
select is(
  (
    select count(*)
    from public.games
    where id::text like '20000000-0000-4000-8000-%'
      and status in ('open', 'full', 'drafted')
  ),
  4::bigint,
  'seed contains four active games'
);
select is(
  (
    select count(*)
    from public.games
    where id::text like '20000000-0000-4000-8000-%'
      and status = 'completed'
  ),
  2::bigint,
  'seed contains two completed games'
);
select is(
  (
    select count(*)
    from public.user_roles
    where user_id = '00000000-0000-4000-8000-000000000001'
      and role = 'admin'
  ),
  1::bigint,
  'seed contains one administrator'
);
select is(
  (
    select count(*)
    from public.tournament_matches
    where game_id::text like '20000000-0000-4000-8000-%'
  ),
  21::bigint,
  'seed contains three eight-player bracket structures'
);
select results_eq(
  $$
    select status::text, count(*)
    from public.games
    where id::text like '20000000-0000-4000-8000-%'
    group by status
    order by status::text
  $$,
  $$
    values
      ('completed'::text, 2::bigint),
      ('drafted'::text, 1::bigint),
      ('full'::text, 1::bigint),
      ('open'::text, 2::bigint)
  $$,
  'seed game statuses match the dashboard fixture design'
);

select * from finish();
rollback;
