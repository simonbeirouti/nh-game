"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQueryClient } from "@tanstack/react-query"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react"
import {
  EllipsisIcon,
  GripVerticalIcon,
  PencilIcon,
  TrophyIcon,
  UserMinusIcon,
} from "lucide-react"

import {
  correctGameMatchResult,
  moveGameParticipant,
  recordGameMatchResult,
  updateGameMatchScore,
} from "@/app/actions/games"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import type { ActionState } from "@/lib/action-state"
import { gameKeys } from "@/lib/games/queries"
import type { TournamentMatch } from "@/lib/tournament/types"

type BracketAction = (formData: FormData) => Promise<ActionState>

function roundName(round: number, total: number) {
  if (round === total) return "Final"
  if (round === total - 1) return "Semi-finals"
  return `Round ${round}`
}

function MatchStatusBadge({
  status,
  preview,
}: {
  status: TournamentMatch["status"]
  preview: boolean
}) {
  if (preview) return <Badge variant="outline">Preview</Badge>

  const presentation = {
    pending: { label: "Not started", className: "" },
    ready: {
      label: "Underway",
      className: "border-warning/30 bg-warning/15 text-warning-foreground",
    },
    complete: {
      label: "Complete",
      className: "border-success/30 bg-success/15 text-success-foreground",
    },
    bye: { label: "Advanced", className: "" },
  }[status]

  return (
    <Badge variant="outline" className={presentation.className}>
      {presentation.label}
    </Badge>
  )
}

function ParticipantSlot({
  gameId,
  match,
  participantId,
  participantIndex,
  name,
  avatar,
  currentUserId,
  draggable,
  canManage,
  pending,
  run,
}: {
  gameId: string
  match: TournamentMatch
  participantId: string
  participantIndex: 0 | 1
  name: string
  avatar: string | null
  currentUserId: string
  draggable: boolean
  canManage: boolean
  pending: boolean
  run: (action: BracketAction, formData: FormData, done?: () => void) => void
}) {
  const [correctionWinnerId, setCorrectionWinnerId] = useState<string | null>(
    null
  )
  const [scoreOpen, setScoreOpen] = useState(false)
  const correcting = match.status === "complete"
  const opponentId =
    participantIndex === 0 ? match.participantBId : match.participantAId
  const score =
    participantIndex === 0 ? match.participantAScore : match.participantBScore
  const sortableId = `${match.id}:${participantId}`
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: { userId: participantId },
    disabled: !draggable,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
  }

  function submitWinner(winnerId: string) {
    const formData = new FormData()
    formData.set("gameId", gameId)
    formData.set("matchId", match.id)
    formData.set("winnerId", winnerId)
    run(
      correcting ? correctGameMatchResult : recordGameMatchResult,
      formData,
      () => setCorrectionWinnerId(null)
    )
  }

  function requestWinner(winnerId: string) {
    if (correcting) {
      if (match.winnerId !== winnerId) setCorrectionWinnerId(winnerId)
      return
    }
    submitWinner(winnerId)
  }

  function saveScore(formData: FormData) {
    formData.set("gameId", gameId)
    formData.set("matchId", match.id)
    run(updateGameMatchScore, formData, () => setScoreOpen(false))
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex min-h-10 items-center gap-1.5 rounded-lg border bg-background px-1.5 py-1.5"
    >
      {draggable ? (
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${name}`}
          disabled={pending}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      ) : null}
      <Avatar size="sm">
        <AvatarImage src={avatar ?? undefined} alt="" />
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate font-medium">
        {name}
        {participantId === currentUserId ? " (you)" : ""}
      </span>
      {score != null ? (
        <span className="font-mono font-medium">{score}</span>
      ) : null}
      {match.status === "complete" && match.winnerId === participantId ? (
        <Badge>Winner</Badge>
      ) : null}
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quick actions for ${name}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={
                  pending ||
                  !["ready", "complete"].includes(match.status) ||
                  match.winnerId === participantId
                }
                onClick={() => requestWinner(participantId)}
              >
                <TrophyIcon /> Set as winner
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  pending ||
                  !opponentId ||
                  !["ready", "complete"].includes(match.status) ||
                  match.winnerId === opponentId
                }
                onClick={() => (opponentId ? requestWinner(opponentId) : null)}
              >
                <UserMinusIcon /> Set as loser
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  pending || !match.participantAId || !match.participantBId
                }
                onClick={() => setScoreOpen(true)}
              >
                <PencilIcon /> Edit score
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog
        open={Boolean(correctionWinnerId)}
        onOpenChange={(open) => (open ? null : setCorrectionWinnerId(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Correct this result?</AlertDialogTitle>
            <AlertDialogDescription>
              The winner will change. Later results that depend on this match
              will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                correctionWinnerId
                  ? submitWinner(correctionWinnerId)
                  : undefined
              }
            >
              Correct result
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit match score</DialogTitle>
            <DialogDescription>
              Record the score without changing the selected winner.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" action={saveScore}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${match.id}-public-score-a`}>
                  Participant A score
                </FieldLabel>
                <Input
                  id={`${match.id}-public-score-a`}
                  name="participantAScore"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={match.participantAScore ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${match.id}-public-score-b`}>
                  Participant B score
                </FieldLabel>
                <Input
                  id={`${match.id}-public-score-b`}
                  name="participantBScore"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={match.participantBScore ?? ""}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save score
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Bracket({
  gameId,
  matches,
  names,
  avatars,
  seeds,
  currentUserId,
  canManage,
  preview,
}: {
  gameId: string
  matches: TournamentMatch[]
  names: Record<string, string>
  avatars: Record<string, string | null>
  seeds: Record<string, number | null>
  currentUserId: string
  canManage: boolean
  preview: boolean
}) {
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  const bracketRef = useRef<HTMLDivElement>(null)
  const matchRefs = useRef(new Map<string, HTMLDivElement>())
  const [connectorLayout, setConnectorLayout] = useState({
    width: 0,
    height: 0,
    paths: [] as Array<{ id: string; d: string; arrow?: boolean }>,
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const roundNumbers = [
    ...new Set(matches.map((match) => match.round)),
  ].toSorted((a, b) => a - b)
  const resultsStarted = matches.some((match) => match.status === "complete")
  const openingSlots = matches
    .filter((match) => match.round === 1)
    .flatMap((match) =>
      [match.participantAId, match.participantBId]
        .filter((id): id is string => Boolean(id))
        .map((id) => `${match.id}:${id}`)
    )

  const updateConnectors = useCallback(() => {
    const bracket = bracketRef.current
    if (!bracket) return
    const bracketRect = bracket.getBoundingClientRect()
    const targetIds = [
      ...new Set(
        matches
          .map((match) => match.nextMatchId)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const paths = targetIds.flatMap((targetId) => {
      const target = matchRefs.current.get(targetId)
      if (!target) return []
      const targetRect = target.getBoundingClientRect()
      const endX = targetRect.left - bracketRect.left
      const endY = targetRect.top - bracketRect.top + targetRect.height / 2
      const sources = matches
        .filter((match) => match.nextMatchId === targetId)
        .flatMap((match) => {
          const source = matchRefs.current.get(match.id)
          if (!source) return []
          const sourceRect = source.getBoundingClientRect()
          return [
            {
              id: match.id,
              x: sourceRect.right - bracketRect.left,
              y: sourceRect.top - bracketRect.top + sourceRect.height / 2,
            },
          ]
        })
      if (!sources.length) return []
      const sourceRight = Math.max(...sources.map((source) => source.x))
      const junctionX = sourceRight + (endX - sourceRight) / 2
      const verticalPoints = [...sources.map((source) => source.y), endY]
      const minY = Math.min(...verticalPoints)
      const maxY = Math.max(...verticalPoints)

      return [
        ...sources.map((source) => ({
          id: `${source.id}-${targetId}-source`,
          d: `M ${source.x} ${source.y} H ${junctionX}`,
        })),
        {
          id: `${targetId}-vertical`,
          d: `M ${junctionX} ${minY} V ${maxY}`,
        },
        {
          id: `${targetId}-target`,
          d: `M ${junctionX} ${endY} H ${endX}`,
          arrow: true,
        },
      ]
    })

    setConnectorLayout({
      width: bracket.scrollWidth,
      height: bracket.scrollHeight,
      paths,
    })
  }, [matches])

  useLayoutEffect(() => {
    const bracket = bracketRef.current
    if (!bracket) return
    const observer = new ResizeObserver(updateConnectors)
    observer.observe(bracket)
    for (const match of matchRefs.current.values()) observer.observe(match)
    updateConnectors()
    window.addEventListener("resize", updateConnectors)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateConnectors)
    }
  }, [updateConnectors])

  function run(action: BracketAction, formData: FormData, done?: () => void) {
    startTransition(async () => {
      const result = await action(formData)
      toast.add({
        title: result.ok ? "Done" : "Could not complete action",
        description: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        done?.()
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
          queryClient.invalidateQueries({ queryKey: gameKeys.catalogs() }),
        ])
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const userId = event.active.data.current?.userId
    const targetUserId = event.over?.data.current?.userId
    const targetSeed = targetUserId ? seeds[targetUserId] : null
    if (!userId || !targetUserId || userId === targetUserId || !targetSeed)
      return
    const formData = new FormData()
    formData.set("gameId", gameId)
    formData.set("userId", userId)
    formData.set("targetSeed", String(targetSeed))
    run(moveGameParticipant, formData)
  }

  return (
    <ScrollArea className="min-h-0 w-full flex-1 pb-4">
      <DndContext
        id={`game-bracket-${gameId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={openingSlots} strategy={rectSortingStrategy}>
          <div
            ref={bracketRef}
            className="relative flex min-h-[32rem] w-full min-w-max items-stretch justify-between gap-16 pr-4 md:min-h-full"
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 overflow-visible text-muted-foreground/60"
              width={connectorLayout.width}
              height={connectorLayout.height}
            >
              <defs>
                <marker
                  id={`bracket-arrow-${gameId}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
                </marker>
              </defs>
              {connectorLayout.paths.map((path) => (
                <path
                  key={path.id}
                  d={path.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  markerEnd={
                    path.arrow ? `url(#bracket-arrow-${gameId})` : undefined
                  }
                />
              ))}
            </svg>
            {roundNumbers.map((round) => (
              <section
                key={round}
                className="flex w-72 shrink-0 flex-col gap-3"
                aria-labelledby={`round-${round}`}
              >
                <h3
                  id={`round-${round}`}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {roundName(round, roundNumbers.length)}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {matches
                    .filter((match) => match.round === round)
                    .toSorted((a, b) => a.slot - b.slot)
                    .map((match) => (
                      <div
                        key={match.id}
                        ref={(node) => {
                          if (node) matchRefs.current.set(match.id, node)
                          else matchRefs.current.delete(match.id)
                        }}
                        className="relative"
                      >
                        <Card size="sm">
                          <CardHeader className="gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle>Match {match.slot}</CardTitle>
                              <MatchStatusBadge
                                status={match.status}
                                preview={preview}
                              />
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-2">
                            {[match.participantAId, match.participantBId].map(
                              (participantId, participantIndex) =>
                                participantId ? (
                                  <ParticipantSlot
                                    key={`${match.id}:${participantId}`}
                                    gameId={gameId}
                                    match={match}
                                    participantId={participantId}
                                    participantIndex={participantIndex as 0 | 1}
                                    name={names[participantId] ?? "Player"}
                                    avatar={avatars[participantId] ?? null}
                                    currentUserId={currentUserId}
                                    draggable={
                                      canManage &&
                                      match.round === 1 &&
                                      !resultsStarted
                                    }
                                    canManage={canManage}
                                    pending={pending}
                                    run={run}
                                  />
                                ) : (
                                  <div
                                    key={`${match.id}:empty:${participantIndex}`}
                                    className="flex min-h-10 items-center rounded-lg border px-3 text-muted-foreground"
                                  >
                                    TBD
                                  </div>
                                )
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
