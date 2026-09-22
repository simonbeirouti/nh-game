import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TrophyIcon, UsersIcon } from "lucide-react"

import { joinAuthenticatedGame } from "@/app/actions/auth"
import { ToastNotification } from "@/components/action-feedback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata: Metadata = { title: "Join a game" }

export default async function JoinGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteToken: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { inviteToken } = await params
  const { error: queryError } = await searchParams
  const admin = createAdminClient()
  const [{ data: game }, user] = await Promise.all([
    admin
      .from("games")
      .select(
        "id,name,description,status,max_participants,game_participants(count)"
      )
      .eq("invite_token", inviteToken)
      .maybeSingle(),
    getCurrentUser(),
  ])
  if (!game) notFound()

  const accepting = game.status === "open"
  const participantCount = game.game_participants?.[0]?.count ?? 0

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrophyIcon aria-hidden="true" />
          </div>
          <CardTitle>{game.name}</CardTitle>
          <CardDescription>
            {game.description ||
              "You have been invited to a CoLabs Games tournament."}
          </CardDescription>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={accepting ? "secondary" : "outline"}>
              {accepting ? "Open" : game.status}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <UsersIcon aria-hidden="true" />
              {participantCount}
              {game.max_participants ? ` / ${game.max_participants}` : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {queryError ? (
            <ToastNotification
              title="Could not join game"
              description={queryError}
              type="error"
            />
          ) : null}
          {!accepting ? (
            <p className="text-sm text-muted-foreground">
              This game is no longer accepting participants.
            </p>
          ) : user ? (
            <form action={joinAuthenticatedGame}>
              <input type="hidden" name="inviteToken" value={inviteToken} />
              <Button type="submit" className="w-full">
                Join as {user.email}
              </Button>
            </form>
          ) : (
            <Button
              className="w-full"
              render={
                <Link
                  href={`/auth?next=${encodeURIComponent(`/join/${inviteToken}`)}`}
                />
              }
              nativeButton={false}
            >
              Sign in to join
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
