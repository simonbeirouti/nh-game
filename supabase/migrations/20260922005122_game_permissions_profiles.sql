-- Server actions call the service RPCs with the service role. With Data API
-- auto-exposure disabled, that role needs explicit table privileges in
-- addition to its RLS bypass capability.
grant usage on schema public to service_role;
grant select, insert, update on public.profiles to service_role;
grant select, insert, update, delete on public.games to service_role;
grant select, insert, update, delete on public.game_participants to service_role;
grant select, insert, update, delete on public.tournament_matches to service_role;
grant select, insert, update, delete on public.randomization_events to service_role;
grant select, insert, update, delete on public.push_subscriptions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
