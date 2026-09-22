"use client"

import { useState } from "react"
import {
  ArchiveIcon,
  ChevronDownIcon,
  PencilIcon,
  ShuffleIcon,
  Trash2Icon,
} from "lucide-react"

import {
  archiveGame,
  deleteGame,
  startGame,
  updateGame,
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type OpenControl = "edit" | "start" | "archive" | "delete" | null

export function GameControls({
  gameId,
  name,
  description,
  maxParticipants,
  canStart,
  canArchive,
}: {
  gameId: string
  name: string
  description: string | null
  maxParticipants: number | null
  canStart: boolean
  canArchive: boolean
}) {
  const [openControl, setOpenControl] = useState<OpenControl>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Actions
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setOpenControl("edit")}>
              <PencilIcon />
              Edit game
            </DropdownMenuItem>
            {canStart ? (
              <DropdownMenuItem onClick={() => setOpenControl("start")}>
                <ShuffleIcon />
                Lock the draw
              </DropdownMenuItem>
            ) : null}
            {canArchive ? (
              <DropdownMenuItem onClick={() => setOpenControl("archive")}>
                <ArchiveIcon />
                Archive game
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setOpenControl("delete")}
            >
              <Trash2Icon />
              Delete game
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={openControl === "edit"}
        onOpenChange={(open) => setOpenControl(open ? "edit" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit game</DialogTitle>
            <DialogDescription>
              Update the game details shown to participants.
            </DialogDescription>
          </DialogHeader>
          <form action={updateGame} className="flex flex-col gap-4">
            <input type="hidden" name="gameId" value={gameId} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-game-name">Game name</FieldLabel>
                <Input
                  id="edit-game-name"
                  name="name"
                  defaultValue={name}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-game-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="edit-game-description"
                  name="description"
                  defaultValue={description ?? ""}
                  maxLength={1000}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-game-limit">
                  Participant limit
                </FieldLabel>
                <Input
                  id="edit-game-limit"
                  name="maxParticipants"
                  type="number"
                  min={2}
                  max={128}
                  defaultValue={maxParticipants ?? ""}
                  placeholder="No limit"
                />
                <FieldDescription>
                  Optional, from 2 to 128 people.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {canStart ? (
        <AlertDialog
          open={openControl === "start"}
          onOpenChange={(open) => setOpenControl(open ? "start" : null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lock this randomized draw?</AlertDialogTitle>
              <AlertDialogDescription>
                The order is generated once and cannot be re-rolled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={startGame}>
                <input type="hidden" name="gameId" value={gameId} />
                <AlertDialogAction type="submit">
                  Generate bracket
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {canArchive ? (
        <AlertDialog
          open={openControl === "archive"}
          onOpenChange={(open) => setOpenControl(open ? "archive" : null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this game?</AlertDialogTitle>
              <AlertDialogDescription>
                Participants can still view it, but no further changes can be
                made.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={archiveGame}>
                <input type="hidden" name="gameId" value={gameId} />
                <AlertDialogAction type="submit" variant="destructive">
                  Archive game
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      <AlertDialog
        open={openControl === "delete"}
        onOpenChange={(open) => setOpenControl(open ? "delete" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              The participants, draw, and bracket history will all be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteGame}>
              <input type="hidden" name="gameId" value={gameId} />
              <AlertDialogAction type="submit" variant="destructive">
                Delete game
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
