import type { Metadata } from "next"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRightIcon, TrophyIcon } from "lucide-react"

import { CreateGameOverlay } from "@/components/create-game-overlay"
import { Badge } from "@/components/ui/badge"
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
import { getCurrentViewer } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { GameStatus } from "@/lib/tournament/types"

export const metadata: Metadata = { title: "Games" }

const statusLabel: Record<GameStatus, string> = {
  open: "Open",
  full: "Full",
  drafted: "In progress",
  completed: "Completed",
  archived: "Archived",
}

type Game = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  max_participants: number | null
  created_at: string
  game_participants: { count: number }[]
}

function GameGrid({
  games,
  emptyTitle,
  emptyDescription,
}: {
  games: Game[]
  emptyTitle: string
  emptyDescription: string
}) {
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
        const participantCount = game.game_participants?.[0]?.count ?? 0
        return (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{game.name}</CardTitle>
                <CardDescription>
                  {game.description || "Single-elimination tournament"}
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">{statusLabel[game.status]}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>
                  {participantCount}
                  {game.max_participants
                    ? ` / ${game.max_participants}`
                    : ""}{" "}
                  participants
                </p>
                <p>
                  Created{" "}
                  {formatDistanceToNow(new Date(game.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </CardContent>
              <CardFooter className="justify-between text-sm font-medium">
                View game
                <ArrowRightIcon aria-hidden="true" />
              </CardFooter>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export default async function DashboardPage() {
  const viewer = (await getCurrentViewer())!
  const supabase = await createClient()
  const gamesClient = viewer.isAdmin ? createAdminClient() : supabase
  const { data: games, error } = await gamesClient
    .from("games")
    .select(
      "id,name,description,status,max_participants,created_at,game_participants(count)"
    )
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const allGames = (games ?? []) as Game[]
  const activeGames = allGames.filter((game) =>
    ["open", "full", "drafted"].includes(game.status)
  )
  const completedGames = allGames.filter((game) =>
    ["completed", "archived"].includes(game.status)
  )

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-4 md:p-8 lg:px-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            {viewer.isAdmin
              ? "All tournaments across NH Games."
              : "Tournaments you organize or have joined."}
          </p>
        </div>
        <CreateGameOverlay />
      </div>

      <Tabs defaultValue="active">
        <TabsList aria-label="Game status">
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
            emptyDescription="Create a game or open a private invitation link to join one."
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
