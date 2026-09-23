import type { GameStatus } from "@/lib/tournament/types"

export function availableAdminParticipants<T extends { id: string }>(
  users: T[],
  participantIds: string[]
): T[] {
  const participantIdSet = new Set(participantIds)
  return users.filter((user) => !participantIdSet.has(user.id))
}

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
