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
import {
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "cn"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BellIcon,
  BellOffIcon,
  ChevronRightIcon,
  EllipsisIcon,
  GripVerticalIcon,
  KeyRoundIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  TrophyIcon,
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react"

import {
  addAdminParticipant,
  archiveAdminGame,
  correctAdminMatchResult,
  deleteAdminGame,
  moveAdminParticipant,
  recordAdminMatchResult,
  removeAdminParticipant,
  resetAdminGame,
  sendAdminPasswordRecovery,
  softDeleteAdminUser,
  startAdminGame,
  unarchiveAdminGame,
  updateAdminGame,
  updateAdminMatchScore,
} from "@/app/actions/admin"
import { CopyInviteButton } from "@/components/copy-invite-button"
import {
  DataTable,
  dataTableFeatures,
  type DataTableColumn,
} from "@/components/data-table"
import { GameStatusBadge } from "@/components/game-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ActionState } from "@/lib/action-state"
import {
  availableAdminParticipants,
  deriveRestoredGameStatus,
} from "@/lib/admin-lifecycle"
import type {
  AdminGameRecord,
  AdminMatchRecord,
  AdminUserRecord,
} from "@/lib/admin-types"
import type { GameStatus } from "@/lib/tournament/types"

const PAGE_SIZE = 25

const userColumnHelper = createColumnHelper<
  typeof dataTableFeatures,
  AdminUserRecord
>()
const gameColumnHelper = createColumnHelper<
  typeof dataTableFeatures,
  AdminGameRecord
>()

type AdminAction = (formData: FormData) => Promise<ActionState>

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function formatDate(value: string | null) {
  return value ? format(new Date(value), "PPp") : "Never"
}

function useAdminMutation() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(
    action: AdminAction,
    formData: FormData,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action(formData)
      toast.add({
        title: result.ok ? "Done" : "Could not complete action",
        description: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        onSuccess?.()
        router.refresh()
      }
    })
  }

  return { pending, run }
}

function UserGames({
  title,
  games,
  onGameSelect,
}: {
  title: string
  games: AdminUserRecord["activeGames"]
  onGameSelect: (gameId: string) => void
}) {
  const recent = games
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary">{games.length}</Badge>
      </div>
      {recent.length ? (
        <ul className="flex flex-col gap-2">
          {recent.map((game) => (
            <li key={game.id}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => onGameSelect(game.id)}
              >
                <span className="truncate">{game.name}</span>
                <GameStatusBadge status={game.status} />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No games in this group.</p>
      )}
      {games.length > recent.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the five most recently updated games.
        </p>
      ) : null}
    </section>
  )
}

function UserProfileContent({
  user,
  currentUserId,
  onClose,
  onGameSelect,
  footer,
}: {
  user: AdminUserRecord
  currentUserId: string
  onClose: () => void
  onGameSelect: (gameId: string) => void
  footer: (children: React.ReactNode) => React.ReactNode
}) {
  const { pending, run } = useAdminMutation()

  function sendReset() {
    const formData = new FormData()
    formData.set("id", user.id)
    run(sendAdminPasswordRecovery, formData)
  }

  function deleteUser() {
    const formData = new FormData()
    formData.set("id", user.id)
    run(softDeleteAdminUser, formData, onClose)
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-32">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-xl">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl font-semibold">{user.fullName}</h2>
            <p className="text-sm break-all text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">{user.role}</Badge>
            {user.notificationDeviceCount > 0 ? (
              <Badge className="bg-success text-success-foreground">
                <BellIcon data-icon="inline-start" />
                Notifications on · {user.notificationDeviceCount} device
                {user.notificationDeviceCount === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="outline">
                <BellOffIcon data-icon="inline-start" />
                Notifications off
              </Badge>
            )}
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last sign-in</dt>
            <dd>{formatDate(user.lastSignInAt)}</dd>
          </div>
        </dl>
        <Separator />
        <UserGames
          title="Active games"
          games={user.activeGames}
          onGameSelect={onGameSelect}
        />
        <UserGames
          title="Completed games"
          games={user.completedGames}
          onGameSelect={onGameSelect}
        />
      </div>
      {footer(
        <>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={sendReset}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <KeyRoundIcon data-icon="inline-start" />
            )}
            Send password reset
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending || user.id === currentUserId}
                />
              }
            >
              <Trash2Icon data-icon="inline-start" />
              Delete user
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove account access?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently disables {user.email}. Their profile, games,
                  brackets, and results remain as history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={deleteUser}>
                  Delete user
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {user.id === currentUserId ? (
            <p className="text-xs text-muted-foreground">
              You cannot delete the account you are currently using.
            </p>
          ) : null}
        </>
      )}
    </>
  )
}

function UserSheet({
  user,
  currentUserId,
  onClose,
  onGameSelect,
}: {
  user: AdminUserRecord | null
  currentUserId: string
  onClose: () => void
  onGameSelect: (gameId: string) => void
}) {
  const isMobile = useIsMobile()
  const open = Boolean(user)

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? null : onClose())}
        showSwipeHandle
      >
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{user?.fullName ?? "User profile"}</DrawerTitle>
            <DrawerDescription>
              Account details, tournament activity, and quick actions.
            </DrawerDescription>
          </DrawerHeader>
          {user ? (
            <UserProfileContent
              user={user}
              currentUserId={currentUserId}
              onClose={onClose}
              onGameSelect={onGameSelect}
              footer={(children) => (
                <DrawerFooter className="border-t pt-4">
                  {children}
                </DrawerFooter>
              )}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? null : onClose())}
    >
      <SheetContent className="overflow-hidden sm:max-w-xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{user?.fullName ?? "User profile"}</SheetTitle>
          <SheetDescription>
            Account details, tournament activity, and quick actions.
          </SheetDescription>
        </SheetHeader>
        {user ? (
          <UserProfileContent
            user={user}
            currentUserId={currentUserId}
            onClose={onClose}
            onGameSelect={onGameSelect}
            footer={(children) => (
              <SheetFooter className="border-t">{children}</SheetFooter>
            )}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ConfirmAction({
  label,
  title,
  description,
  pending,
  destructive = false,
  icon,
  className,
  onConfirm,
}: {
  label: string
  title: string
  description: string
  pending: boolean
  destructive?: boolean
  icon: React.ReactNode
  className?: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={destructive ? "destructive" : "outline"}
            disabled={pending}
            className={className}
          />
        }
      >
        {icon}
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ParticipantSlot({
  game,
  match,
  participantId,
  participantName,
  participantIndex,
  draggable,
  pending,
  run,
}: {
  game: AdminGameRecord
  match: AdminMatchRecord
  participantId: string
  participantName: string
  participantIndex: 0 | 1
  draggable: boolean
  pending: boolean
  run: ReturnType<typeof useAdminMutation>["run"]
}) {
  const correcting = match.status === "complete"
  const [correctionWinnerId, setCorrectionWinnerId] = useState<string | null>(
    null
  )
  const [scoreOpen, setScoreOpen] = useState(false)
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
    formData.set("gameId", game.id)
    formData.set("matchId", match.id)
    formData.set("winnerId", winnerId)
    run(
      correcting ? correctAdminMatchResult : recordAdminMatchResult,
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
    formData.set("gameId", game.id)
    formData.set("matchId", match.id)
    run(updateAdminMatchScore, formData, () => setScoreOpen(false))
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex min-h-10 items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
    >
      {draggable ? (
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${participantName}`}
          disabled={pending}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium">
        {participantName}
      </span>
      {score != null ? (
        <span className="font-mono font-medium">{score}</span>
      ) : null}
      {match.winnerId === participantId ? <Badge>Winner</Badge> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quick actions for ${participantName}`}
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
              <TrophyIcon />
              Set as winner
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
              <UserMinusIcon />
              Set as loser
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={
                pending || !match.participantAId || !match.participantBId
              }
              onClick={() => setScoreOpen(true)}
            >
              <PencilIcon />
              Edit score
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={Boolean(correctionWinnerId)}
        onOpenChange={(open) => (open ? null : setCorrectionWinnerId(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Correct this result?</AlertDialogTitle>
            <AlertDialogDescription>
              The winner will change. Any later results that depend on this
              match will be cleared and must be recorded again.
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
                <FieldLabel htmlFor={`${match.id}-score-a`}>
                  Participant A score
                </FieldLabel>
                <Input
                  id={`${match.id}-score-a`}
                  name="participantAScore"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={match.participantAScore ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${match.id}-score-b`}>
                  Participant B score
                </FieldLabel>
                <Input
                  id={`${match.id}-score-b`}
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

function MatchStatusBadge({ status }: { status: AdminMatchRecord["status"] }) {
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

function DraftDialog({
  game,
  open,
  onOpenChange,
  pending,
  run,
}: {
  game: AdminGameRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  run: ReturnType<typeof useAdminMutation>["run"]
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const participants = [...game.participants].sort(
    (left, right) =>
      (left.seedPosition ?? Number.MAX_SAFE_INTEGER) -
      (right.seedPosition ?? Number.MAX_SAFE_INTEGER)
  )
  const participantsById = new Map(
    participants.map((participant) => [participant.id, participant])
  )
  const rounds = new Map<number, AdminMatchRecord[]>()
  for (const match of game.matches) {
    const current = rounds.get(match.round) ?? []
    current.push(match)
    rounds.set(match.round, current)
  }
  const resultsStarted = game.matches.some(
    (match) => match.status === "complete"
  )
  const openingSlots = (rounds.get(1) ?? []).flatMap((match) =>
    [match.participantAId, match.participantBId]
      .filter((id): id is string => Boolean(id))
      .map((id) => `${match.id}:${id}`)
  )

  function moveParticipant(userId: string, targetSeed: number) {
    const formData = new FormData()
    formData.set("gameId", game.id)
    formData.set("userId", userId)
    formData.set("targetSeed", String(targetSeed))
    run(moveAdminParticipant, formData)
  }

  function handleDragEnd(event: DragEndEvent) {
    const userId = event.active.data.current?.userId
    const targetUserId = event.over?.data.current?.userId
    if (!userId || !targetUserId || userId === targetUserId) return
    const targetParticipant = participantsById.get(targetUserId)
    if (targetParticipant?.seedPosition) {
      moveParticipant(userId, targetParticipant.seedPosition)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent
          onBackdropPointerDown={() => onOpenChange(false)}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-6xl"
        >
          <DialogHeader>
            <DialogTitle>{game.name} draft</DialogTitle>
            <DialogDescription>
              Review seeds and quickly record or correct match results.
            </DialogDescription>
          </DialogHeader>

          <div>
            <section className="flex min-w-0 flex-col">
              <DndContext
                id={`admin-bracket-${game.id}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={openingSlots}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid min-h-[40rem] gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[...rounds.entries()].map(
                      ([round, matches], roundIndex, roundEntries) => (
                        <div
                          key={round}
                          className="flex h-full min-w-0 flex-col gap-2"
                        >
                          <h4 className="text-sm font-medium">Round {round}</h4>
                          <div className="flex flex-1 flex-col justify-around gap-3">
                            {matches.map((match) => {
                              const participantA = match.participantAId
                                ? participantsById.get(match.participantAId)
                                : null
                              const participantB = match.participantBId
                                ? participantsById.get(match.participantBId)
                                : null
                              return (
                                <div key={match.id} className="relative">
                                  <Card>
                                    <CardHeader className="gap-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-sm">
                                          Match {match.slot}
                                        </CardTitle>
                                        <MatchStatusBadge
                                          status={match.status}
                                        />
                                      </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                      {[participantA, participantB].map(
                                        (participant, participantIndex) =>
                                          participant ? (
                                            <ParticipantSlot
                                              key={`${match.id}:${participant.id}`}
                                              game={game}
                                              match={match}
                                              participantId={participant.id}
                                              participantName={
                                                participant.fullName
                                              }
                                              participantIndex={
                                                participantIndex as 0 | 1
                                              }
                                              draggable={
                                                match.round === 1 &&
                                                !resultsStarted
                                              }
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
                                  {roundIndex < roundEntries.length - 1 ? (
                                    <>
                                      <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 left-full hidden w-4 border-t border-muted-foreground/40 xl:block"
                                      />
                                      <ChevronRightIcon
                                        aria-hidden="true"
                                        className="absolute top-1/2 -right-4 hidden size-3 -translate-y-1/2 text-muted-foreground xl:block"
                                      />
                                    </>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function GameSheet({
  game,
  users,
  onClose,
}: {
  game: AdminGameRecord | null
  users: AdminUserRecord[]
  onClose: () => void
}) {
  const { pending, run } = useAdminMutation()
  const isMobile = useIsMobile()
  const [statusOverride, setStatusOverride] = useState<GameStatus | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)

  function gameData() {
    const formData = new FormData()
    if (game) formData.set("gameId", game.id)
    return formData
  }

  if (!game) return null

  const effectiveStatus = statusOverride ?? game.status
  const participantsEditable = ["open", "full"].includes(effectiveStatus)
  const canStart = participantsEditable && game.participants.length >= 2
  const availableUsers = availableAdminParticipants(
    users,
    game.participants.map((participant) => participant.id)
  )
  const hasCapacity =
    game.maxParticipants === null ||
    game.participants.length < game.maxParticipants
  const canAddParticipant =
    participantsEditable && hasCapacity && availableUsers.length > 0
  const Panel = isMobile ? Drawer : Sheet
  const PanelContent = isMobile ? DrawerContent : SheetContent
  const PanelHeader = isMobile ? DrawerHeader : SheetHeader
  const PanelTitle = isMobile ? DrawerTitle : SheetTitle
  const PanelDescription = isMobile ? DrawerDescription : SheetDescription
  const PanelFooter = isMobile ? DrawerFooter : SheetFooter

  return (
    <>
      <Panel
        open
        onOpenChange={(open) => (open ? null : onClose())}
        {...(isMobile ? { showSwipeHandle: true } : {})}
      >
        <PanelContent
          className={cn(
            "flex flex-col overflow-hidden",
            isMobile ? "max-h-[92dvh]" : "h-full sm:max-w-2xl"
          )}
        >
          <PanelHeader className={cn(!isMobile && "pr-12")}>
            <PanelTitle>{game.name}</PanelTitle>
            <PanelDescription>
              Organized by {game.organizerName}
              {game.organizerActive ? "" : " (deleted account)"}
            </PanelDescription>
            <div className="w-fit">
              <GameStatusBadge status={effectiveStatus} />
            </div>
          </PanelHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-8">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(game.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(game.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Randomized</dt>
                <dd>{formatDate(game.randomizedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Completed</dt>
                <dd>{formatDate(game.completedAt)}</dd>
              </div>
            </dl>

            <CopyInviteButton url={game.inviteUrl} />

            <Separator />

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-medium">
                    <UsersIcon aria-hidden="true" /> Participants
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add or remove active accounts before the draw is locked.
                  </p>
                </div>
                <Badge variant="secondary">
                  {game.participants.length}
                  {game.maxParticipants ? ` / ${game.maxParticipants}` : ""}
                </Badge>
              </div>

              {game.participants.length ? (
                <ul className="flex flex-col gap-2">
                  {game.participants.map((participant) => (
                    <li
                      key={participant.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={participant.avatarUrl ?? undefined}
                          alt=""
                        />
                        <AvatarFallback>
                          {initials(participant.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">
                          {participant.fullName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {participant.email ?? "Deleted account"}
                        </span>
                      </span>
                      {participantsEditable ? (
                        <ConfirmAction
                          label="Remove"
                          title={`Remove ${participant.fullName}?`}
                          description="They can rejoin while the game remains open and has capacity."
                          pending={pending}
                          destructive
                          icon={<UserMinusIcon data-icon="inline-start" />}
                          onConfirm={() => {
                            const formData = gameData()
                            formData.set("userId", participant.id)
                            run(removeAdminParticipant, formData)
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No participants have joined this game.
                </p>
              )}

              {canAddParticipant ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    run(addAdminParticipant, new FormData(event.currentTarget))
                  }}
                >
                  <input type="hidden" name="gameId" value={game.id} />
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`admin-participant-${game.id}`}>
                        Add participant
                      </FieldLabel>
                      <Field orientation="horizontal">
                        <NativeSelect
                          id={`admin-participant-${game.id}`}
                          name="userId"
                          className="flex-1"
                          defaultValue={availableUsers[0]?.id}
                          required
                        >
                          {availableUsers.map((user) => (
                            <NativeSelectOption key={user.id} value={user.id}>
                              {user.fullName} ({user.email})
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <Button type="submit" disabled={pending}>
                          {pending ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <UserPlusIcon data-icon="inline-start" />
                          )}
                          Add
                        </Button>
                      </Field>
                      <FieldDescription>
                        Only active accounts not already in this game are shown.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </form>
              ) : null}

              {participantsEditable && !hasCapacity ? (
                <p className="text-sm text-muted-foreground">
                  The participant limit has been reached.
                </p>
              ) : null}
            </section>

            <Separator />

            <form
              key={game.updatedAt}
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                run(updateAdminGame, new FormData(event.currentTarget))
              }}
            >
              <div>
                <h3 className="flex items-center gap-2 font-medium">
                  <PencilIcon aria-hidden="true" /> Edit game
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update information shown to participants.
                </p>
              </div>
              <input type="hidden" name="gameId" value={game.id} />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`admin-name-${game.id}`}>
                    Name
                  </FieldLabel>
                  <Input
                    id={`admin-name-${game.id}`}
                    name="name"
                    defaultValue={game.name}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`admin-description-${game.id}`}>
                    Description
                  </FieldLabel>
                  <Textarea
                    id={`admin-description-${game.id}`}
                    name="description"
                    defaultValue={game.description ?? ""}
                    maxLength={1000}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`admin-limit-${game.id}`}>
                    Participant limit
                  </FieldLabel>
                  <Input
                    id={`admin-limit-${game.id}`}
                    name="maxParticipants"
                    type="number"
                    min={2}
                    max={128}
                    defaultValue={game.maxParticipants ?? ""}
                    placeholder="No limit"
                  />
                  <FieldDescription>
                    Cannot be lower than the {game.participants.length} current
                    participants.
                  </FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    Save changes
                  </Button>
                </Field>
              </FieldGroup>
            </form>

            {game.matches.length ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraftOpen(true)}
              >
                <TrophyIcon data-icon="inline-start" /> Draft
              </Button>
            ) : null}
          </div>
          <PanelFooter className={cn("border-t", isMobile && "pt-4")}>
            <div className="grid grid-cols-2 gap-2">
              {canStart ? (
                <ConfirmAction
                  label="Start draw"
                  title="Create and lock the draw?"
                  description="Participants will be randomized once and seeded into the bracket."
                  pending={pending}
                  className="col-span-2 w-full justify-start"
                  icon={<PlayIcon data-icon="inline-start" />}
                  onConfirm={() => run(startAdminGame, gameData())}
                />
              ) : null}
              {["drafted", "completed"].includes(effectiveStatus) ? (
                <ConfirmAction
                  label="Reset draw"
                  title="Reset this draw and every result?"
                  description="The bracket, randomization record, seeds, and results will be permanently removed."
                  pending={pending}
                  destructive
                  className="col-span-2 w-full justify-start"
                  icon={<RotateCcwIcon data-icon="inline-start" />}
                  onConfirm={() => run(resetAdminGame, gameData())}
                />
              ) : null}
              {effectiveStatus === "archived" ? (
                <ConfirmAction
                  label="Unarchive"
                  title="Restore this game?"
                  description="The prior state will be restored from the preserved draw and completion data."
                  pending={pending}
                  className="w-full justify-start"
                  icon={<ArchiveRestoreIcon data-icon="inline-start" />}
                  onConfirm={() =>
                    run(unarchiveAdminGame, gameData(), () =>
                      setStatusOverride(
                        deriveRestoredGameStatus({
                          completedAt: game.completedAt,
                          randomizedAt: game.randomizedAt,
                          maxParticipants: game.maxParticipants,
                          participantCount: game.participants.length,
                        })
                      )
                    )
                  }
                />
              ) : (
                <ConfirmAction
                  label="Archive"
                  title="Archive this game?"
                  description="Participants can still view its preserved bracket and results."
                  pending={pending}
                  className="w-full justify-start"
                  icon={<ArchiveIcon data-icon="inline-start" />}
                  onConfirm={() =>
                    run(archiveAdminGame, gameData(), () =>
                      setStatusOverride("archived")
                    )
                  }
                />
              )}
              <ConfirmAction
                label="Delete game"
                title="Delete this game permanently?"
                description="Participants, bracket, randomization data, and results will all be removed."
                pending={pending}
                destructive
                className="w-full justify-start"
                icon={<Trash2Icon data-icon="inline-start" />}
                onConfirm={() => run(deleteAdminGame, gameData(), onClose)}
              />
            </div>
          </PanelFooter>
        </PanelContent>
      </Panel>
      {game.matches.length ? (
        <DraftDialog
          game={game}
          open={draftOpen}
          onOpenChange={setDraftOpen}
          pending={pending}
          run={run}
        />
      ) : null}
    </>
  )
}

function UserQuickActions({
  user,
  currentUserId,
}: {
  user: AdminUserRecord
  currentUserId: string
}) {
  const { pending, run } = useAdminMutation()
  const [deleteOpen, setDeleteOpen] = useState(false)

  function sendReset() {
    const formData = new FormData()
    formData.set("id", user.id)
    run(sendAdminPasswordRecovery, formData)
  }

  function deleteUser() {
    const formData = new FormData()
    formData.set("id", user.id)
    run(softDeleteAdminUser, formData, () => setDeleteOpen(false))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quick actions for ${user.fullName}`}
              className="opacity-100 transition-opacity md:opacity-0 md:group-focus-within/user-row:opacity-100 md:group-hover/user-row:opacity-100"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={pending} onClick={sendReset}>
              <KeyRoundIcon />
              Send password reset
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={pending || user.id === currentUserId}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove account access?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently disables {user.email}. Their profile, games,
              brackets, and results remain as history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteUser}>
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function GameQuickActions({
  game,
  onOpen,
}: {
  game: AdminGameRecord
  onOpen: () => void
}) {
  const { pending, run } = useAdminMutation()
  const [deleteOpen, setDeleteOpen] = useState(false)

  function gameData() {
    const formData = new FormData()
    formData.set("gameId", game.id)
    return formData
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quick actions for ${game.name}`}
              className="opacity-100 transition-opacity md:opacity-0 md:group-focus-within/game-row:opacity-100 md:group-hover/game-row:opacity-100"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onOpen}>
              <PencilIcon />
              Open details
            </DropdownMenuItem>
            {game.status === "archived" ? (
              <DropdownMenuItem
                disabled={pending}
                onClick={() => run(unarchiveAdminGame, gameData())}
              >
                <ArchiveRestoreIcon />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={pending}
                onClick={() => run(archiveAdminGame, gameData())}
              >
                <ArchiveIcon />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            Delete game
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {game.name}, its participants, bracket, and results will all be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(deleteAdminGame, gameData(), () => setDeleteOpen(false))
              }
            >
              Delete game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function AdminConsole({
  currentUserId,
  users,
  games,
}: {
  currentUserId: string
  users: AdminUserRecord[]
  games: AdminGameRecord[]
}) {
  const [activeTab, setActiveTab] = useState<"users" | "games">("users")
  const [userSearch, setUserSearch] = useState("")
  const [gameSearch, setGameSearch] = useState("")
  const deferredUserSearch = useDeferredValue(userSearch.toLowerCase())
  const deferredGameSearch = useDeferredValue(gameSearch.toLowerCase())
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null
  const searchValue = activeTab === "users" ? userSearch : gameSearch

  const userColumns = useMemo(
    () =>
      userColumnHelper.columns([
        userColumnHelper.accessor((user) => `${user.fullName} ${user.email}`, {
          id: "user",
          header: "User",
          sortFn: "text",
          sortDescFirst: false,
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarImage src={row.original.avatarUrl ?? undefined} alt="" />
                <AvatarFallback>
                  {initials(row.original.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {row.original.fullName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.original.email}
                </span>
              </span>
            </div>
          ),
        }),
        userColumnHelper.accessor("role", {
          header: "Role",
          sortFn: "text",
          sortDescFirst: false,
          cell: ({ row }) => (
            <Badge variant="secondary">{row.original.role}</Badge>
          ),
        }),
        userColumnHelper.accessor((user) => user.activeGames.length, {
          id: "activeGames",
          header: "Active",
          sortFn: "basic",
          sortDescFirst: false,
        }),
        userColumnHelper.accessor((user) => user.completedGames.length, {
          id: "completedGames",
          header: "Completed",
          sortFn: "basic",
          sortDescFirst: false,
        }),
        userColumnHelper.accessor(
          (user) => new Date(user.createdAt).getTime(),
          {
            id: "createdAt",
            header: "Created",
            sortFn: "basic",
            sortDescFirst: false,
            cell: ({ row }) => format(new Date(row.original.createdAt), "PP"),
          }
        ),
        userColumnHelper.accessor(
          (user) =>
            user.lastSignInAt
              ? new Date(user.lastSignInAt).getTime()
              : undefined,
          {
            id: "lastSignInAt",
            header: "Last sign-in",
            sortFn: "basic",
            sortUndefined: "last",
            sortDescFirst: false,
            cell: ({ row }) =>
              row.original.lastSignInAt
                ? format(new Date(row.original.lastSignInAt), "PP")
                : "Never",
          }
        ),
        userColumnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Quick actions</span>,
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <div className="text-right">
              <UserQuickActions
                user={row.original}
                currentUserId={currentUserId}
              />
            </div>
          ),
        }),
      ]) as DataTableColumn<AdminUserRecord>[],
    [currentUserId]
  )

  const gameColumns = useMemo(
    () =>
      gameColumnHelper.columns([
        gameColumnHelper.accessor("name", {
          header: "Game",
          sortFn: "text",
          sortDescFirst: false,
          cell: ({ row }) => (
            <span className="font-medium">{row.original.name}</span>
          ),
        }),
        gameColumnHelper.accessor("status", {
          header: "Status",
          sortFn: "text",
          sortDescFirst: false,
          cell: ({ row }) => <GameStatusBadge status={row.original.status} />,
        }),
        gameColumnHelper.accessor("organizerName", {
          header: "Organizer",
          sortFn: "text",
          sortDescFirst: false,
        }),
        gameColumnHelper.accessor((game) => game.participants.length, {
          id: "participants",
          header: "Participants",
          sortFn: "basic",
          sortDescFirst: false,
          cell: ({ row }) => (
            <>
              {row.original.participants.length}
              {row.original.maxParticipants
                ? ` / ${row.original.maxParticipants}`
                : ""}
            </>
          ),
        }),
        gameColumnHelper.accessor(
          (game) =>
            game.championId
              ? game.participants.find(
                  (participant) => participant.id === game.championId
                )?.fullName
              : undefined,
          {
            id: "champion",
            header: "Champion",
            sortFn: "text",
            sortUndefined: "last",
            sortDescFirst: false,
            cell: ({ getValue }) => getValue() ?? "—",
          }
        ),
        gameColumnHelper.accessor(
          (game) => new Date(game.updatedAt).getTime(),
          {
            id: "updatedAt",
            header: "Updated",
            sortFn: "basic",
            sortDescFirst: false,
            cell: ({ row }) => format(new Date(row.original.updatedAt), "PP"),
          }
        ),
        gameColumnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Quick actions</span>,
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <div className="text-right">
              <GameQuickActions
                game={row.original}
                onOpen={() => setSelectedGameId(row.original.id)}
              />
            </div>
          ),
        }),
      ]) as DataTableColumn<AdminGameRecord>[],
    []
  )

  function updateSearch(value: string) {
    if (activeTab === "users") {
      setUserSearch(value)
    } else {
      setGameSearch(value)
    }
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "users" | "games")}
        className="gap-4"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
            <p className="text-muted-foreground">
              Manage users, games, participants, and tournament results.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <InputGroup className="md:w-72">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchValue}
                onChange={(event) => updateSearch(event.currentTarget.value)}
                aria-label={
                  activeTab === "users" ? "Search users" : "Search games"
                }
                placeholder={
                  activeTab === "users" ? "Search users…" : "Search games…"
                }
              />
            </InputGroup>
            <TabsList
              className="grid w-full grid-cols-2 md:inline-flex md:w-fit"
              aria-label="Admin records"
            >
              <TabsTrigger value="users">
                Users <Badge variant="secondary">{users.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="games">
                Games <Badge variant="secondary">{games.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="users" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <DataTable
                columns={userColumns}
                data={users}
                globalFilter={deferredUserSearch}
                onGlobalFilterChange={setUserSearch}
                pageSize={PAGE_SIZE}
                rowClassName={() => "group/user-row"}
                rowLabel={(user) => `View ${user.fullName}`}
                onRowActivate={(user) => setSelectedUserId(user.id)}
                empty={
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersIcon />
                      </EmptyMedia>
                      <EmptyTitle>No users found</EmptyTitle>
                      <EmptyDescription>Try another search.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="games" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <DataTable
                columns={gameColumns}
                data={games}
                globalFilter={deferredGameSearch}
                onGlobalFilterChange={setGameSearch}
                pageSize={PAGE_SIZE}
                rowClassName={() => "group/game-row"}
                rowLabel={(game) => `View ${game.name}`}
                onRowActivate={(game) => setSelectedGameId(game.id)}
                empty={
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <TrophyIcon />
                      </EmptyMedia>
                      <EmptyTitle>No games found</EmptyTitle>
                      <EmptyDescription>Try another search.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UserSheet
        user={selectedUser}
        currentUserId={currentUserId}
        onClose={() => setSelectedUserId(null)}
        onGameSelect={(gameId) => {
          setSelectedUserId(null)
          setSelectedGameId(gameId)
        }}
      />
      <GameSheet
        key={`${selectedGame?.id ?? "closed"}:${selectedGame?.status ?? "none"}`}
        game={selectedGame}
        users={users}
        onClose={() => setSelectedGameId(null)}
      />
    </>
  )
}
