import type { GameStatus } from "@/lib/tournament/types"

export function deriveRestoredGameStatus({
  completedAt,
  randomizedAt,
  maxParticipants,
  participantCount,
}: {
  completedAt: string | null
  randomizedAt: string | null
  maxParticipants: number | null
  participantCount: number
}): GameStatus {
  if (completedAt) return "completed"
  if (randomizedAt) return "drafted"
  if (maxParticipants !== null && participantCount >= maxParticipants) {
    return "full"
  }
  return "open"
}
