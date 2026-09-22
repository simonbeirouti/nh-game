import type { User } from "@supabase/supabase-js"

import type {
  AdminConsoleData,
  AdminGameRecord,
  AdminMatchRecord,
  AdminParticipantRecord,
  AdminUserRecord,
} from "@/lib/admin-types"
import type { GameStatus } from "@/lib/tournament/types"

const ACTIVE_STATUSES = new Set<GameStatus>(["open", "full", "drafted"])

type AuthUser = Pick<User, "id" | "email" | "created_at" | "last_sign_in_at">

type ProfileRow = {
  id: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

type RoleRow = { user_id: string; role: string }
type PushSubscriptionRow = { user_id: string }

type GameRow = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  created_by: string
  max_participants: number | null
  invite_token: string
  randomized_at: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

type ParticipantRow = {
  game_id: string
  user_id: string
  seed_position: number | null
  joined_at: string
}

type MatchRow = {
  id: string
  game_id: string
  round: number
  slot: number
  participant_a_id: string | null
  participant_b_id: string | null
  winner_id: string | null
  participant_a_score?: number | null
  participant_b_score?: number | null
  status: AdminMatchRecord["status"]
  next_match_id: string | null
}

export type AdminAggregationInput = {
  authUsers: AuthUser[]
  profiles: ProfileRow[]
  roles: RoleRow[]
  pushSubscriptions: PushSubscriptionRow[]
  games: GameRow[]
  participants: ParticipantRow[]
  matches: MatchRow[]
  appOrigin: string
}

function historicalName(
  profileName: string | undefined,
  isActive: boolean,
  fallback: string
) {
  return profileName ?? (isActive ? fallback : "Deleted account")
}

export function aggregateAdminConsoleData({
  authUsers,
  profiles,
  roles,
  pushSubscriptions,
  games,
  participants,
  matches,
  appOrigin,
}: AdminAggregationInput): AdminConsoleData {
  const authById = new Map(authUsers.map((user) => [user.id, user]))
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const roleById = new Map(roles.map((role) => [role.user_id, role.role]))
  const notificationCountByUser = new Map<string, number>()
  for (const subscription of pushSubscriptions) {
    notificationCountByUser.set(
      subscription.user_id,
      (notificationCountByUser.get(subscription.user_id) ?? 0) + 1
    )
  }
  const participantsByGame = new Map<string, ParticipantRow[]>()
  const matchesByGame = new Map<string, MatchRow[]>()

  for (const participant of participants) {
    const current = participantsByGame.get(participant.game_id) ?? []
    current.push(participant)
    participantsByGame.set(participant.game_id, current)
  }
  for (const match of matches) {
    const current = matchesByGame.get(match.game_id) ?? []
    current.push(match)
    matchesByGame.set(match.game_id, current)
  }

  const adminGames: AdminGameRecord[] = games.map((game) => {
    const gameParticipants: AdminParticipantRecord[] = (
      participantsByGame.get(game.id) ?? []
    ).map((participant) => {
      const authUser = authById.get(participant.user_id)
      const profile = profileById.get(participant.user_id)
      return {
        id: participant.user_id,
        email: authUser?.email ?? null,
        fullName: historicalName(
          profile?.full_name,
          Boolean(authUser),
          authUser?.email?.split("@")[0] ?? "Player"
        ),
        avatarUrl: profile?.avatar_url ?? null,
        isActive: Boolean(authUser),
        seedPosition: participant.seed_position,
        joinedAt: participant.joined_at,
      }
    })
    const gameMatches: AdminMatchRecord[] = (
      matchesByGame.get(game.id) ?? []
    ).map((match) => ({
      id: match.id,
      round: match.round,
      slot: match.slot,
      participantAId: match.participant_a_id,
      participantBId: match.participant_b_id,
      winnerId: match.winner_id,
      participantAScore: match.participant_a_score ?? null,
      participantBScore: match.participant_b_score ?? null,
      status: match.status,
      nextMatchId: match.next_match_id,
    }))
    const organizerProfile = profileById.get(game.created_by)
    const organizerAuth = authById.get(game.created_by)
    const championId = gameMatches.find(
      (match) => match.nextMatchId === null && match.status === "complete"
    )?.winnerId

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      status: game.status,
      organizerId: game.created_by,
      organizerName: historicalName(
        organizerProfile?.full_name,
        Boolean(organizerAuth),
        "Unknown organizer"
      ),
      organizerActive: Boolean(organizerAuth),
      maxParticipants: game.max_participants,
      inviteUrl: `${appOrigin}/join/${game.invite_token}`,
      randomizedAt: game.randomized_at,
      completedAt: game.completed_at,
      archivedAt: game.archived_at,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
      championId: championId ?? null,
      participants: gameParticipants,
      matches: gameMatches,
    }
  })

  const gamesByUser = new Map<string, AdminGameRecord[]>()
  for (const game of adminGames) {
    const relatedIds = new Set([
      game.organizerId,
      ...game.participants.map((participant) => participant.id),
    ])
    for (const userId of relatedIds) {
      const current = gamesByUser.get(userId) ?? []
      current.push(game)
      gamesByUser.set(userId, current)
    }
  }

  const users: AdminUserRecord[] = authUsers
    .map((user) => {
      const profile = profileById.get(user.id)
      const relatedGames = gamesByUser.get(user.id) ?? []
      const references = relatedGames.map((game) => ({
        id: game.id,
        name: game.name,
        status: game.status,
        updatedAt: game.updatedAt,
      }))
      return {
        id: user.id,
        email: user.email ?? "No email",
        fullName: profile?.full_name ?? user.email?.split("@")[0] ?? "Player",
        avatarUrl: profile?.avatar_url ?? null,
        role: roleById.get(user.id) === "admin" ? "admin" : "user",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        notificationDeviceCount: notificationCountByUser.get(user.id) ?? 0,
        activeGames: references.filter((game) =>
          ACTIVE_STATUSES.has(game.status)
        ),
        completedGames: references.filter((game) =>
          ["completed", "archived"].includes(game.status)
        ),
      } satisfies AdminUserRecord
    })
    .toSorted((a, b) => a.fullName.localeCompare(b.fullName))

  return { users, games: adminGames }
}
