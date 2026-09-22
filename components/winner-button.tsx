"use client"

import { CheckIcon } from "lucide-react"

import { recordMatchResult } from "@/app/actions/games"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function WinnerButton({ gameId, matchId, winnerId, winnerName }: { gameId: string; matchId: string; winnerId: string; winnerName: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <CheckIcon data-icon="inline-start" />
        {winnerName}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record {winnerName} as winner?</AlertDialogTitle>
          <AlertDialogDescription>This advances the bracket and cannot be edited in this first release.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={recordMatchResult}>
            <input type="hidden" name="gameId" value={gameId} />
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="winnerId" value={winnerId} />
            <AlertDialogAction type="submit">Record winner</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

