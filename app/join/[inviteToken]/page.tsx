import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { TriangleAlertIcon, TrophyIcon, UsersIcon } from "lucide-react"

import { joinAuthenticatedGame } from "@/app/actions/auth"
import { JoinGameForm } from "@/components/join-game-form"
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
import { getCurrentViewer } from "@/lib/auth"
import { onboardingPath } from "@/lib/auth-redirect"
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
  const [game, viewer] = await Promise.all([
    loadInvitedGame(inviteToken),
    getCurrentViewer(),
  ])
  if (!game) notFound()

  if (viewer && !viewer.onboardingComplete) {
    redirect(onboardingPath(`/join/${inviteToken}`))
  }

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
          ) : viewer ? (
            <JoinGameForm
              action={joinAuthenticatedGame}
              fieldName="inviteToken"
              fieldValue={inviteToken}
              gameName={game.name}
              label={`Join as ${viewer.displayName}`}
            />
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
