create type public.app_role as enum ('admin');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create index user_roles_role_idx on public.user_roles (role);

alter table public.user_roles enable row level security;

revoke all on public.user_roles from public, anon, authenticated;
grant select, insert, update, delete on public.user_roles to service_role;

create or replace function public.service_bootstrap_admin(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  lock table public.user_roles in exclusive mode;

  if exists (
    select 1 from public.user_roles where role = 'admin'
  ) then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'admin');
  return true;
end;
$$;

revoke all on function public.service_bootstrap_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.service_bootstrap_admin(uuid) to service_role;
