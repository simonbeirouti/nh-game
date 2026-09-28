begin;

select plan(4);

select has_column(
  'public',
  'profiles',
  'onboarding_completed_at',
  'profiles record onboarding completion'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'onboarding_completed_at',
    'update'
  ),
  'authenticated clients cannot mark onboarding complete'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update'),
  'authenticated clients can still update their display name'
);

select ok(
  has_column_privilege(
    'service_role',
    'public.profiles',
    'onboarding_completed_at',
    'update'
  ),
  'the server can mark onboarding complete'
);

select * from finish();

rollback;
