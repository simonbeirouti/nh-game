import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeftIcon, CrownIcon, UsersIcon } from "lucide-react"

import { leaveOrRemoveParticipant } from "@/app/actions/games"
import { Bracket } from "@/components/bracket"
import { CopyInviteButton } from "@/components/copy-invite-button"
import { GameControls } from "@/components/game-controls"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentViewer } from "@/lib/auth"
import { appUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { GameStatus, TournamentMatch } from "@/lib/tournament/types"

export const metadata: Metadata = { title: "Game" }

const statusLabel: Record<GameStatus, string> = {
  open: "Open",
  full: "Full",
  drafted: "In progress",
  completed: "Completed",
  archived: "Archived",
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
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

  const [{ data: participants }, { data: matches }, { data: randomization }] =
    await Promise.all([
      dataClient
        .from("game_participants")
        .select("user_id,seed_position,joined_at")
        .eq("game_id", gameId)
        .order("joined_at"),
      dataClient
        .from("tournament_matches")
        .select(
          "id,round,slot,participant_a_id,participant_b_id,winner_id,status,next_match_id,next_slot"
        )
        .eq("game_id", gameId)
        .order("round")
        .order("slot"),
      dataClient
        .from("randomization_events")
        .select("order_hash,created_at")
        .eq("game_id", gameId)
        .maybeSingle(),
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
    status: match.status,
    nextMatchId: match.next_match_id,
    nextSlot: match.next_slot,
  }))
  const championId = normalizedMatches.find(
    (match) => match.nextMatchId === null && match.status === "complete"
  )?.winnerId

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-4 py-6 md:px-8 md:py-10 lg:px-12">
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost", className: "w-fit" })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Back to games
      </Link>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {game.name}
            </h1>
            <Badge variant="secondary">
              {statusLabel[game.status as GameStatus]}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {game.description || "Single-elimination tournament"}
          </p>
          {game.randomized_at ? (
            <p className="text-xs text-muted-foreground">
              Draw locked {format(new Date(game.randomized_at), "PPp")}
              {randomization
                ? ` · verification ${randomization.order_hash.slice(0, 10)}`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {inviteUrl ? <CopyInviteButton url={inviteUrl} /> : null}
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
            />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="draft">
        <TabsList aria-label="Game details">
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
        </TabsList>
        <TabsContent value="draft" className="pt-4">
          <section
            className="flex flex-col gap-4"
            aria-labelledby="participants-heading"
          >
            <div>
              <h2 id="participants-heading" className="text-lg font-medium">
                Draft and participants
              </h2>
              <p className="text-sm text-muted-foreground">
                {profileIds.length}
                {game.max_participants
                  ? ` of ${game.max_participants}`
                  : ""}{" "}
                joined.
              </p>
            </div>
            <Card>
              <CardContent>
                {participants?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seed</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants
                        .toSorted(
                          (a, b) =>
                            (a.seed_position ?? 999) - (b.seed_position ?? 999)
                        )
                        .map((participant) => (
                          <TableRow
                            key={participant.user_id}
                            data-state={
                              participant.user_id === user.id
                                ? "selected"
                                : undefined
                            }
                          >
                            <TableCell>
                              {participant.seed_position
                                ? `#${participant.seed_position}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-2 font-medium">
                                <Avatar size="sm">
                                  <AvatarImage
                                    src={
                                      avatars[participant.user_id] ?? undefined
                                    }
                                    alt=""
                                  />
                                  <AvatarFallback>
                                    {(names[participant.user_id] ?? "P")
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {names[participant.user_id] ?? "Player"}
                                {participant.user_id === user.id
                                  ? " (you)"
                                  : ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {["open", "full"].includes(game.status) &&
                              (canManage || participant.user_id === user.id) ? (
                                <form action={leaveOrRemoveParticipant}>
                                  <input
                                    type="hidden"
                                    name="gameId"
                                    value={gameId}
                                  />
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={participant.user_id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                  >
                                    {participant.user_id === user.id
                                      ? "Leave"
                                      : "Remove"}
                                  </Button>
                                </form>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>
        <TabsContent value="bracket" className="pt-4">
          <section
            className="flex flex-col gap-4"
            aria-labelledby="bracket-heading"
          >
            <div>
              <h2 id="bracket-heading" className="text-lg font-medium">
                Bracket
              </h2>
              <p className="text-sm text-muted-foreground">
                See every match and who each player is up against.
              </p>
            </div>
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
            {normalizedMatches.length ? (
              <Bracket
                gameId={gameId}
                matches={normalizedMatches}
                names={names}
                avatars={avatars}
                currentUserId={user.id}
                canManage={canManage && game.status === "drafted"}
              />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CrownIcon />
                  </EmptyMedia>
                  <EmptyTitle>Draw not locked</EmptyTitle>
                  <EmptyDescription>
                    The organizer will generate the bracket when everyone has
                    joined.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </main>
  )
}
