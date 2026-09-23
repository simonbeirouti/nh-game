import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TriangleAlertIcon, TrophyIcon, UsersIcon } from "lucide-react"

import { joinAuthenticatedGame } from "@/app/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { loadInvitedGame } from "@/lib/games/invite"

type JoinGamePageProps = {
  params: Promise<{ inviteToken: string }>
  searchParams: Promise<{ error?: string }>
}

function inviteDescription(name: string, description: string | null) {
  return description || `You have been invited to join ${name} on CoLabs Games.`
}

export async function generateMetadata({
  params,
}: JoinGamePageProps): Promise<Metadata> {
  const { inviteToken } = await params
  const game = await loadInvitedGame(inviteToken)
  if (!game) return { title: "Join a game" }

  const title = `Join ${game.name}`
  const description = inviteDescription(game.name, game.description)

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function JoinGamePage({
  params,
  searchParams,
}: JoinGamePageProps) {
  const { inviteToken } = await params
  const { error: queryError } = await searchParams
  const [game, user] = await Promise.all([
    loadInvitedGame(inviteToken),
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
            <Alert variant="destructive" className="mb-4">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>Could not join game</AlertTitle>
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
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
