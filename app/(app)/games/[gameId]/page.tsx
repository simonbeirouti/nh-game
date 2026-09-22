import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, CrownIcon, Trash2Icon, UsersIcon } from "lucide-react"

import { leaveOrRemoveParticipant } from "@/app/actions/games"
import { ToastNotification } from "@/components/action-feedback"
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
import { getCurrentViewer } from "@/lib/auth"
import { appUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { SingleEliminationFormat } from "@/lib/tournament/single-elimination"
import type { GameStatus, TournamentMatch } from "@/lib/tournament/types"

export const metadata: Metadata = { title: "Game" }

function ParticipantsList({
  participants,
  gameId,
  gameStatus,
  currentUserId,
  canManage,
  names,
  avatars,
}: {
  participants: Array<{ user_id: string; seed_position: number | null }>
  gameId: string
  gameStatus: GameStatus
  currentUserId: string
  canManage: boolean
  names: Record<string, string>
  avatars: Record<string, string | null>
}) {
  if (!participants.length) {
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
      {participants.map((participant) => (
        <div
          key={participant.user_id}
          className="flex min-h-14 items-center gap-3 border-b px-3 py-2 last:border-b-0"
        >
          <Avatar>
            <AvatarImage
              src={avatars[participant.user_id] ?? undefined}
              alt=""
            />
            <AvatarFallback>
              {(names[participant.user_id] ?? "P").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-medium">
            {names[participant.user_id] ?? "Player"}
            {participant.user_id === currentUserId ? " (you)" : ""}
          </span>
          {["open", "full"].includes(gameStatus) &&
          (canManage || participant.user_id === currentUserId) ? (
            <form action={leaveOrRemoveParticipant}>
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="userId" value={participant.user_id} />
              <Button
                type="submit"
                size="icon-sm"
                variant="destructive"
                aria-label={`Remove ${names[participant.user_id] ?? "player"}`}
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

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ joined?: string }>
}) {
  const { gameId } = await params
  const { joined } = await searchParams
  const viewer = (await getCurrentViewer())!
  const user = viewer.user
  const supabase = await createClient()
  const dataClient = viewer.isAdmin ? createAdminClient() : supabase
  const { data: game } = await dataClient
    .from("games")
    .select(
      "id,name,description,status,created_by,max_participants,randomized_at,completed_at"
    )
    .eq("id", gameId)
    .maybeSingle()
  if (!game) notFound()

  const [{ data: participants }, { data: matches }] = await Promise.all([
    dataClient
      .from("game_participants")
      .select("user_id,seed_position,joined_at")
      .eq("game_id", gameId)
      .order("joined_at"),
    dataClient
      .from("tournament_matches")
      .select(
        "id,round,slot,participant_a_id,participant_b_id,winner_id,participant_a_score,participant_b_score,status,next_match_id,next_slot"
      )
      .eq("game_id", gameId)
      .order("round")
      .order("slot"),
  ])
  const profileIds =
    participants?.map((participant) => participant.user_id) ?? []
  const { data: profiles } = profileIds.length
    ? await dataClient
        .from("profiles")
        .select("id,full_name,avatar_url")
        .in("id", profileIds)
    : { data: [] }
  const names = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name])
  )
  const avatars = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.avatar_url])
  )
  const seeds = Object.fromEntries(
    (participants ?? []).map((participant) => [
      participant.user_id,
      participant.seed_position,
    ])
  )
  const isCreator = game.created_by === user.id
  const canManage = isCreator || viewer.isAdmin

  let inviteUrl: string | null = null
  if (canManage && ["open", "full"].includes(game.status)) {
    const admin = createAdminClient()
    const { data } = await admin
      .from("games")
      .select("invite_token")
      .eq("id", gameId)
      .single()
    if (data) inviteUrl = `${appUrl()}/join/${data.invite_token}`
  }

  const normalizedMatches: TournamentMatch[] = (matches ?? []).map((match) => ({
    id: match.id,
    round: match.round,
    slot: match.slot,
    participantAId: match.participant_a_id,
    participantBId: match.participant_b_id,
    winnerId: match.winner_id,
    participantAScore: match.participant_a_score,
    participantBScore: match.participant_b_score,
    status: match.status,
    nextMatchId: match.next_match_id,
    nextSlot: match.next_slot,
  }))
  const isPreview = normalizedMatches.length === 0
  let previewIndex = 0
  const previewFormat = new SingleEliminationFormat(
    () => `preview-${gameId}-${++previewIndex}`
  )
  const previewMatches: TournamentMatch[] =
    profileIds.length >= 2
      ? previewFormat.initialize(
          profileIds.map((userId, index) => ({ userId, seed: index + 1 }))
        ).matches
      : [
          {
            id: `preview-${gameId}-1`,
            round: 1,
            slot: 1,
            participantAId: profileIds[0] ?? null,
            participantBId: null,
            winnerId: null,
            status: "pending",
            nextMatchId: null,
            nextSlot: null,
          },
        ]
  const displayMatches = isPreview ? previewMatches : normalizedMatches
  const displaySeeds = isPreview
    ? Object.fromEntries(profileIds.map((userId, index) => [userId, index + 1]))
    : seeds
  const championId = normalizedMatches.find(
    (match) => match.nextMatchId === null && match.status === "complete"
  )?.winnerId

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 md:h-[calc(100svh-3.5rem)] md:overflow-hidden md:px-8 md:py-8 lg:px-12">
      {joined === "1" ? (
        <ToastNotification
          title="Game joined"
          description="You have been added to the tournament."
          type="success"
        />
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
        <GameStatusBadge status={game.status as GameStatus} />
        <div className="grid w-full auto-cols-fr grid-flow-col gap-2 md:ml-auto md:flex md:w-auto md:items-center">
          {inviteUrl ? (
            <CopyInviteButton className="w-full md:w-auto" url={inviteUrl} />
          ) : null}
          <GameParticipantsDrawer participantCount={profileIds.length}>
            <ParticipantsList
              participants={participants ?? []}
              gameId={gameId}
              gameStatus={game.status as GameStatus}
              currentUserId={user.id}
              canManage={canManage}
              names={names}
              avatars={avatars}
            />
          </GameParticipantsDrawer>
          {canManage ? (
            <GameControls
              gameId={gameId}
              name={game.name}
              description={game.description}
              maxParticipants={game.max_participants}
              canStart={
                ["open", "full"].includes(game.status) && profileIds.length >= 2
              }
              canArchive={game.status !== "archived"}
              className="w-full md:w-auto"
            />
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
          aria-labelledby="bracket-heading"
        >
          {championId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CrownIcon aria-hidden="true" /> Champion
                </CardTitle>
                <CardDescription>
                  {names[championId] ?? "Winner"} won the tournament.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          <Bracket
            gameId={gameId}
            matches={displayMatches}
            names={names}
            avatars={avatars}
            seeds={displaySeeds}
            currentUserId={user.id}
            canManage={
              !isPreview &&
              canManage &&
              ["drafted", "completed"].includes(game.status)
            }
            preview={isPreview}
          />
        </section>
      </div>
    </main>
  )
}
