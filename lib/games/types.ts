import type { GameStatus, TournamentMatch } from "@/lib/tournament/types"

export type GameAccess = "joinable" | "member" | "owner" | "admin"

export type GameCatalogItem = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  maxParticipants: number | null
  participantCount: number
  createdAt: string
  access: GameAccess
}

export type GameParticipant = {
  id: string
  fullName: string
  avatarUrl: string | null
  seedPosition: number | null
  joinedAt: string
}

export type GameDetail = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  maxParticipants: number | null
  randomizedAt: string | null
  completedAt: string | null
  currentUserId: string
  canManage: boolean
  participants: GameParticipant[]
  matches: TournamentMatch[]
  seeds: Record<string, number | null>
  championId: string | null
  preview: boolean
}

export type GameInvite = {
  inviteUrl: string
}

export type GameInvalidationEvent = {
  entity: "game" | "participant" | "match" | "profile"
  operation: "INSERT" | "UPDATE" | "DELETE"
  gameId: string | null
}
