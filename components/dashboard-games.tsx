"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRightIcon, TrophyIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { joinPublicGame } from "@/app/actions/games"
import { ToastNotification } from "@/components/action-feedback"
import { CreateGameOverlay } from "@/components/create-game-overlay"
import { GameStatusBadge } from "@/components/game-status-badge"
import { Badge } from "@/components/ui/badge"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOnline } from "@/hooks/use-online"
import { gameCatalogOptions } from "@/lib/games/queries"
import type { GameCatalogItem } from "@/lib/games/types"

function GameGrid({
  games,
  emptyTitle,
  emptyDescription,
}: {
  games: GameCatalogItem[]
  emptyTitle: string
  emptyDescription: string
}) {
  const online = useOnline()

  if (!games.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrophyIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {games.map((game) => {
        const canJoin = game.access === "joinable"
        const card = (
          <Card className="h-full min-h-56 transition-shadow hover:shadow-md">
            <CardHeader className="min-h-20">
              <CardTitle>{game.name}</CardTitle>
              <CardDescription>
                {game.description || "Single-elimination tournament"}
              </CardDescription>
              <CardAction>
                <GameStatusBadge status={game.status} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
              <p>
                {game.participantCount}
                {game.maxParticipants ? ` / ${game.maxParticipants}` : ""}{" "}
                participants
              </p>
              <p>
                Created{" "}
                {formatDistanceToNow(new Date(game.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </CardContent>
            {canJoin ? (
              <CardFooter>
                <form action={joinPublicGame} className="w-full">
                  <input type="hidden" name="gameId" value={game.id} />
                  <Button type="submit" className="w-full" disabled={!online}>
                    {online ? "Join game" : "Reconnect to join"}
                    <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </form>
              </CardFooter>
            ) : (
              <CardFooter className="justify-between text-sm font-medium">
                View game
                <ArrowRightIcon aria-hidden="true" />
              </CardFooter>
            )}
          </Card>
        )

        return canJoin ? (
          <div key={game.id}>{card}</div>
        ) : (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {card}
          </Link>
        )
      })}
    </div>
  )
}

export function DashboardGames({
  userId,
  isAdmin,
  joinError,
  passwordUpdated,
}: {
  userId: string
  isAdmin: boolean
  joinError?: string
  passwordUpdated: boolean
}) {
  const online = useOnline()
  const { data: games = [] } = useQuery(gameCatalogOptions(userId))
  const activeGames = games.filter((game) =>
    ["open", "full", "drafted"].includes(game.status)
  )
  const completedGames = games.filter((game) =>
    ["completed", "archived"].includes(game.status)
  )

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-4 md:p-8 lg:px-12">
      {passwordUpdated ? (
        <ToastNotification
          title="Password updated"
          description="Your new password is ready to use."
          type="success"
        />
      ) : null}
      {joinError ? (
        <ToastNotification
          title="Could not join game"
          description={joinError}
          type="error"
        />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "All tournaments across CoLabs Games."
              : "Tournaments you organize, have joined, or can join."}
          </p>
        </div>
        {online ? <CreateGameOverlay /> : null}
      </div>

      <Tabs defaultValue="active">
        <TabsList className="w-full md:w-fit" aria-label="Game status">
          <TabsTrigger value="active">
            Active <Badge variant="secondary">{activeGames.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed <Badge variant="secondary">{completedGames.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="pt-4">
          <GameGrid
            games={activeGames}
            emptyTitle="No active games"
            emptyDescription="Create a game or check back when a new game opens."
          />
        </TabsContent>
        <TabsContent value="completed" className="pt-4">
          <GameGrid
            games={completedGames}
            emptyTitle="No completed games"
            emptyDescription="Finished and archived games will appear here."
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
