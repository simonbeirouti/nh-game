alter table public.profiles
  add column onboarding_completed_at timestamptz;

-- Existing accounts confirm their current name on their next visit. New
-- accounts also start incomplete, including profiles created by the auth flow.

-- Profile completion is recorded only by the authenticated server action.
-- Keep ordinary profile edits available through the existing Data API grants.
revoke insert, update on public.profiles from authenticated;
grant insert (id, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
