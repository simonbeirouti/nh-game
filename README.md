# CoLabs Games

CoLabs Games is a private tournament manager. It supports a shared passwordless
email login, invite-only game membership, user-created single-elimination games,
reproducible secure draws, winner progression, archiving, and opt-in push
notifications. Administrators are assigned through the locked `user_roles`
database table and can manage every game.

## Local setup

Prerequisites: Node.js, pnpm, Docker, and the Supabase CLI.

```bash
pnpm install
cp .env.example .env.local
supabase start
supabase status
```

Copy the local publishable and service-role keys printed by `supabase status`
into `.env.local`, then generate VAPID keys with `pnpm exec web-push generate-vapid-keys`
if you want to exercise notifications.

`ADMIN_EMAIL` bootstraps the first administrator only while no admin role exists.
After bootstrap, assign any additional administrators directly in the database.
There are no legacy login or pending-invitation routes: every email link returns
through `/auth/confirm`, and invitations resume from `/join/{token}`.

```bash
pnpm dev
```

Open `http://127.0.0.1:3000`. Local email is available at
`http://127.0.0.1:7004`. Supabase uses the isolated 7000-series ports documented
in `supabase/config.toml`; Next.js remains on port 3000.

Reset the local database and load the visual development fixtures with:

```bash
pnpm db:reset
```

The seed creates 20 users, four active games, and two completed games. Use the
forgot-password flow for `hello@simonbeirouti.com` to set a local password and
see all six games as the seeded administrator. Other seeded accounts use
`player02@example.com` through `player20@example.com`.

For realistic service-worker and push testing, use `pnpm dev:https` and set
`NEXT_PUBLIC_APP_URL=https://localhost:3000`.

## Validation

```bash
supabase db reset --local
supabase test db
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

The browser smoke test expects Playwright's Chromium binary. Install it once
with `pnpm exec playwright install chromium` if it is not already present.
