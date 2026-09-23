import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, UsersIcon } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata: Metadata = {
  title: "Private tournaments, made simple",
  description:
    "Create private games, invite your group, and run a fair tournament.",
}

type LatestGame = {
  id: string
  name: string
  description: string | null
  max_participants: number | null
  game_participants: { count: number }[]
}

export default async function HomePage() {
  const admin = createAdminClient()
  const latestGamesQuery = admin
    .from("games")
    .select("id,name,description,max_participants,game_participants(count)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(4)

  const [user, { data, error }] = await Promise.all([
    getCurrentUser(),
    latestGamesQuery,
  ])
  if (error) throw new Error(error.message)

  const games = (data ?? []) as LatestGame[]

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6"
        >
          <Link
            href="/"
            aria-label="CoLabs Games"
            className="rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <Button render={<Link href="/dashboard" />} nativeButton={false}>
                Dashboard
              </Button>
            ) : (
              <Button render={<Link href="/auth" />} nativeButton={false}>
                Sign in
              </Button>
            )}
          </div>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <section className="flex max-w-2xl flex-col items-start gap-5">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Friendly tournaments, without the admin.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Create a private game, invite your group, and run a fair bracket
            from start to finish.
          </p>
          {user ? (
            <Button
              size="lg"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              View dashboard
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="lg"
              render={<Link href="/auth" />}
              nativeButton={false}
            >
              Sign in or create an account
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          )}
        </section>

        <section
          aria-labelledby="latest-games-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="latest-games-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Latest games
            </h2>
            <p className="text-sm text-muted-foreground">
              The newest games still open to join.
            </p>
          </div>

          {games.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => {
                const participantCount = game.game_participants?.[0]?.count ?? 0
                const card = (
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle>{game.name}</CardTitle>
                      <CardDescription>
                        {game.description || "Single-elimination tournament"}
                      </CardDescription>
                      <CardAction>
                        <Badge variant="secondary">Open</Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <UsersIcon aria-hidden="true" />
                      {participantCount}
                      {game.max_participants
                        ? ` of ${game.max_participants}`
                        : ""}{" "}
                      joined
                    </CardContent>
                    <CardFooter className="justify-between font-medium">
                      {user ? "View game" : "Private invitation required"}
                      {user ? <ArrowRightIcon aria-hidden="true" /> : null}
                    </CardFooter>
                  </Card>
                )

                return user ? (
                  <Link
                    key={game.id}
                    href={`/games/${game.id}`}
                    aria-label={`${game.name}, open game`}
                    className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {card}
                  </Link>
                ) : (
                  <div key={game.id}>{card}</div>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No open games yet</CardTitle>
                <CardDescription>
                  The latest open games will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>
      </div>
    </main>
  )
}
