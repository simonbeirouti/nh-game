"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  CrownIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { leaveOrRemoveParticipant } from "@/app/actions/games"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Bracket } from "@/components/bracket"
import { CopyInviteButton } from "@/components/copy-invite-button"
import { GameControls } from "@/components/game-controls"
import { GameParticipantsDrawer } from "@/components/game-participants-drawer"
import { GameStatusBadge } from "@/components/game-status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton"
import { useOnline } from "@/hooks/use-online"
import {
  gameDetailOptions,
  gameInviteOptions,
  gameKeys,
} from "@/lib/games/queries"
import type { GameDetail } from "@/lib/games/types"

const subscribeToHydration = () => () => {}

function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
}

export function ReadOnlyParticipants({ game }: { game: GameDetail }) {
  if (!game.participants.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No participants</EmptyTitle>
          <EmptyDescription>
            Share the private invite link to fill the bracket.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {game.participants.map((participant) => (
        <div
          key={participant.id}
          className="flex min-h-14 items-center gap-3 border-b px-3 py-2 last:border-b-0"
        >
          <Avatar>
            <AvatarImage src={participant.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>
              {participant.fullName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-medium">
            {participant.fullName}
            {participant.id === game.currentUserId ? " (you)" : ""}
          </span>
        </div>
      ))}
    </div>
  )
}

function ParticipantsList({ game }: { game: GameDetail }) {
  const online = useOnline()
  const queryClient = useQueryClient()

  async function removeParticipant(formData: FormData) {
    await leaveOrRemoveParticipant(formData)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(game.id) }),
      queryClient.invalidateQueries({ queryKey: gameKeys.catalogs() }),
    ])
  }

  if (!game.participants.length) return <ReadOnlyParticipants game={game} />

  return (
    <div className="overflow-hidden rounded-xl border">
      {game.participants.map((participant) => (
        <div
          key={participant.id}
          className="flex min-h-14 items-center gap-3 border-b px-3 py-2 last:border-b-0"
        >
          <Avatar>
            <AvatarImage src={participant.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>
              {participant.fullName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-medium">
            {participant.fullName}
            {participant.id === game.currentUserId ? " (you)" : ""}
          </span>
          {online &&
          ["open", "full"].includes(game.status) &&
          (game.canManage || participant.id === game.currentUserId) ? (
            <form action={removeParticipant}>
              <input type="hidden" name="gameId" value={game.id} />
              <input type="hidden" name="userId" value={participant.id} />
              <Button
                type="submit"
                size="icon-sm"
                variant="destructive"
                aria-label={`Remove ${participant.fullName}`}
              >
                <Trash2Icon />
              </Button>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function GameDetailView({
  game,
  joined = false,
  offline = false,
}: {
  game: GameDetail
  joined?: boolean
  offline?: boolean
}) {
  const online = useOnline()
  const isHydrated = useIsHydrated()
  const [showJoinWelcome, setShowJoinWelcome] = useState(joined)

  useEffect(() => {
    if (!joined) return
    const url = new URL(window.location.href)
    url.searchParams.delete("joined")
    window.history.replaceState(window.history.state, "", url)
  }, [joined, game.id])

  const interactive = online && !offline
  const invite = useQuery(
    gameInviteOptions(
      game.id,
      interactive && game.canManage && ["open", "full"].includes(game.status)
    )
  )
  const names = Object.fromEntries(
    game.participants.map((participant) => [
      participant.id,
      participant.fullName,
    ])
  )
  const avatars = Object.fromEntries(
    game.participants.map((participant) => [
      participant.id,
      participant.avatarUrl,
    ])
  )
  const currentPlayer = game.participants.find(
    (participant) => participant.id === game.currentUserId
  )

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 md:h-[calc(100svh-3.5rem)] md:overflow-hidden md:px-8 md:py-8 lg:px-12">
      {showJoinWelcome && currentPlayer ? (
        <Alert
          role="status"
          aria-live="polite"
          className="border-primary/25 bg-primary/5 px-4 py-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
        >
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>You’re in, {currentPlayer.fullName}!</AlertTitle>
          <AlertDescription>
            You’ve joined {game.name}. Your name is in the player list.
            {game.status === "drafted" || game.status === "completed"
              ? " Find your position in the bracket below."
              : " Your bracket position will appear when the draw starts."}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss welcome message"
              onClick={() => setShowJoinWelcome(false)}
            >
              <XIcon />
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to games"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "-ml-2 md:w-auto md:px-2.5",
          })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <span className="hidden md:inline">Back to games</span>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {game.name}
        </h1>
        <GameStatusBadge status={game.status} />
        <div className="grid w-full auto-cols-fr grid-flow-col gap-2 md:ml-auto md:flex md:w-auto md:items-center">
          {isHydrated && invite.data ? (
            <CopyInviteButton
              className="w-full md:w-auto"
              url={invite.data.inviteUrl}
            />
          ) : null}
          <GameParticipantsDrawer participantCount={game.participants.length}>
            {offline ? (
              <ReadOnlyParticipants game={game} />
            ) : (
              <ParticipantsList game={game} />
            )}
          </GameParticipantsDrawer>
          {interactive && game.canManage ? (
            <GameControls
              gameId={game.id}
              name={game.name}
              description={game.description}
              maxParticipants={game.maxParticipants}
              canStart={
                ["open", "full"].includes(game.status) &&
                game.participants.length >= 2
              }
              canArchive={game.status !== "archived"}
              className="w-full md:w-auto"
            />
          ) : null}
        </div>
      </header>
      {offline ? (
        <p className="text-sm text-muted-foreground" role="status">
          Offline read-only view. Reconnect to refresh or make changes.
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
          aria-labelledby="bracket-heading"
        >
          {game.championId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CrownIcon aria-hidden="true" /> Champion
                </CardTitle>
                <CardDescription>
                  {names[game.championId] ?? "Winner"} won the tournament.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          <Bracket
            gameId={game.id}
            matches={game.matches}
            names={names}
            avatars={avatars}
            seeds={game.seeds}
            currentUserId={game.currentUserId}
            canManage={
              interactive &&
              !game.preview &&
              game.canManage &&
              ["drafted", "completed"].includes(game.status)
            }
            preview={game.preview}
          />
        </section>
      </div>
    </main>
  )
}

export function GamePageContent({
  gameId,
  joined,
}: {
  gameId: string
  joined: boolean
}) {
  const { data } = useQuery(gameDetailOptions(gameId))
  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </main>
    )
  }
  return <GameDetailView key={gameId} game={data} joined={joined} />
}
