begin;

select plan(8);

select is(
  (select count(*) from auth.users),
  20::bigint,
  'seed contains 20 authentication users'
);
select is(
  (select count(*) from auth.identities where provider = 'email'),
  20::bigint,
  'every seeded user has an email identity'
);
select is(
  (select count(*) from public.profiles),
  20::bigint,
  'seed contains 20 application profiles'
);
select is(
  (
    select count(*)
    from public.games
    where status in ('open', 'full', 'drafted')
  ),
  4::bigint,
  'seed contains four active games'
);
select is(
  (select count(*) from public.games where status = 'completed'),
  2::bigint,
  'seed contains two completed games'
);
select is(
  (select count(*) from public.user_roles where role = 'admin'),
  1::bigint,
  'seed contains one administrator'
);
select is(
  (select count(*) from public.tournament_matches),
  21::bigint,
  'seed contains three eight-player bracket structures'
);
select results_eq(
  $$
    select status::text, count(*)
    from public.games
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
