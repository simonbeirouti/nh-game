import type { GameStatus } from "@/lib/tournament/types"

export type AdminGameReference = {
  id: string
  name: string
  status: GameStatus
  updatedAt: string
}

export type AdminUserRecord = {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: "admin" | "user"
  createdAt: string
  lastSignInAt: string | null
  notificationDeviceCount: number
  activeGames: AdminGameReference[]
  completedGames: AdminGameReference[]
}

export type AdminParticipantRecord = {
  id: string
  email: string | null
  fullName: string
  avatarUrl: string | null
  isActive: boolean
  seedPosition: number | null
  joinedAt: string
}

export type AdminMatchRecord = {
  id: string
  round: number
  slot: number
  participantAId: string | null
  participantBId: string | null
  winnerId: string | null
  participantAScore?: number | null
  participantBScore?: number | null
  status: "pending" | "ready" | "complete" | "bye"
  nextMatchId: string | null
}

export type AdminGameRecord = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  organizerId: string
  organizerName: string
  organizerActive: boolean
  maxParticipants: number | null
  inviteUrl: string
  randomizedAt: string | null
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  championId: string | null
  participants: AdminParticipantRecord[]
  matches: AdminMatchRecord[]
}

export type AdminConsoleData = {
  users: AdminUserRecord[]
  games: AdminGameRecord[]
}
