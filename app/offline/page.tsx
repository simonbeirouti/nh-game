"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ArrowRightIcon, TrophyIcon, WifiOffIcon } from "lucide-react"

import { GameDetailView } from "@/components/game-page-content"
import { GameStatusBadge } from "@/components/game-status-badge"
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
import type { GameCatalogItem, GameDetail } from "@/lib/games/types"
import { readActivePersistedClient } from "@/lib/query-persistence"

const offlineQueryClient = new QueryClient()

type OfflineState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "catalog"; games: GameCatalogItem[] }
  | { kind: "game"; game: GameDetail }

function OfflineUnavailable() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <WifiOffIcon aria-hidden="true" />
          <CardTitle>
            <h1>You are offline</h1>
          </CardTitle>
          <CardDescription>
            This private view is not available in the saved offline data.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

function OfflineCatalog({ games }: { games: GameCatalogItem[] }) {
  const activeGames = games.filter((game) =>
    ["open", "full", "drafted"].includes(game.status)
  )

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-8 lg:px-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Saved games</h1>
        <p className="text-muted-foreground">
          Offline read-only view. Reconnect to refresh or make changes.
        </p>
      </div>
      {activeGames.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {activeGames.map((game) => {
            const joinable = game.access === "joinable"
            const card = (
              <Card className="h-full min-h-56">
                <CardHeader>
                  <CardTitle>{game.name}</CardTitle>
                  <CardDescription>
                    {game.description || "Single-elimination tournament"}
                  </CardDescription>
                  <CardAction>
                    <GameStatusBadge status={game.status} />
                  </CardAction>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {game.participantCount}
                  {game.maxParticipants
                    ? ` / ${game.maxParticipants}`
                    : ""}{" "}
                  participants
                </CardContent>
                <CardFooter>
                  {joinable ? (
                    <Button className="w-full" disabled>
                      Reconnect to join
                    </Button>
                  ) : (
                    <span className="flex w-full items-center justify-between text-sm font-medium">
                      View saved game <ArrowRightIcon aria-hidden="true" />
                    </span>
                  )}
                </CardFooter>
              </Card>
            )
            return joinable ? (
              <div key={game.id}>{card}</div>
            ) : (
              <Link key={game.id} href={`/games/${game.id}`}>
                {card}
              </Link>
            )
          })}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrophyIcon />
            </EmptyMedia>
            <EmptyTitle>No saved active games</EmptyTitle>
            <EmptyDescription>
              Reconnect to refresh your games.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  )
}

function OfflineContent() {
  const [state, setState] = useState<OfflineState>({ kind: "loading" })

  useEffect(() => {
    let cancelled = false
    void readActivePersistedClient().then((persisted) => {
      if (cancelled || !persisted) {
        if (!cancelled) setState({ kind: "unavailable" })
        return
      }

      const path = window.location.pathname
      const queries = persisted.client.clientState.queries
      const gameMatch = path.match(/^\/games\/([^/]+)$/)
      if (gameMatch) {
        const detail = queries.find(
          (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "games" &&
            query.queryKey[1] === "detail" &&
            query.queryKey[2] === gameMatch[1]
        )?.state.data as GameDetail | undefined
        setState(
          detail ? { kind: "game", game: detail } : { kind: "unavailable" }
        )
        return
      }

      if (path === "/dashboard" || path === "/offline") {
        const catalog = queries.find(
          (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "games" &&
            query.queryKey[1] === "catalog" &&
            query.queryKey[2] === persisted.userId
        )?.state.data as GameCatalogItem[] | undefined
        setState(
          catalog
            ? { kind: "catalog", games: catalog }
            : { kind: "unavailable" }
        )
        return
      }

      setState({ kind: "unavailable" })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === "loading") {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <WifiOffIcon aria-hidden="true" />
            <CardTitle>
              <h1>You are offline</h1>
            </CardTitle>
            <CardDescription>Loading saved games…</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }
  if (state.kind === "catalog") return <OfflineCatalog games={state.games} />
  if (state.kind === "game") {
    return <GameDetailView game={state.game} offline />
  }
  return <OfflineUnavailable />
}

export default function OfflinePage() {
  return (
    <QueryClientProvider client={offlineQueryClient}>
      <OfflineContent />
    </QueryClientProvider>
  )
}
