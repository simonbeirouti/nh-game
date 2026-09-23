import "server-only"

import { appUrl } from "@/lib/env"
import { getCurrentViewer } from "@/lib/auth"
import {
  mergeVisibleGameCatalog,
  toGameCatalogItem,
  type GameCatalogRow,
} from "@/lib/games/catalog"
import type { GameCatalogItem, GameDetail, GameInvite } from "@/lib/games/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { SingleEliminationFormat } from "@/lib/tournament/single-elimination"
import type { GameStatus, TournamentMatch } from "@/lib/tournament/types"

const catalogSelect =
  "id,name,description,status,created_by,max_participants,created_at,game_participants(count)"

export async function loadGameCatalog(): Promise<GameCatalogItem[]> {
  const viewer = await getCurrentViewer()
  if (!viewer) throw new Error("Authentication is required")

  if (viewer.isAdmin) {
    const { data, error } = await createAdminClient()
      .from("games")
      .select(catalogSelect)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as GameCatalogRow[]).map((row) =>
      toGameCatalogItem(row, "admin")
    )
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const [memberResult, publicResult] = await Promise.all([
    supabase
      .from("games")
      .select(catalogSelect)
      .order("created_at", { ascending: false }),
    admin
      .from("games")
      .select(catalogSelect)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ])
  if (memberResult.error) throw new Error(memberResult.error.message)
  if (publicResult.error) throw new Error(publicResult.error.message)

  return mergeVisibleGameCatalog(
    (memberResult.data ?? []) as GameCatalogRow[],
    (publicResult.data ?? []) as GameCatalogRow[],
    viewer.user.id
  )
}

export async function loadGameDetail(
  gameId: string
): Promise<GameDetail | null> {
  const viewer = await getCurrentViewer()
  if (!viewer) throw new Error("Authentication is required")

  const supabase = await createClient()
  const dataClient = viewer.isAdmin ? createAdminClient() : supabase
  const { data: game, error: gameError } = await dataClient
    .from("games")
    .select(
      "id,name,description,status,created_by,max_participants,randomized_at,completed_at"
    )
    .eq("id", gameId)
    .maybeSingle()
  if (gameError) throw new Error(gameError.message)
  if (!game) return null

  const [participantResult, matchResult] = await Promise.all([
    dataClient
      .from("game_participants")
      .select("user_id,seed_position,joined_at")
      .eq("game_id", gameId)
      .order("joined_at"),
    dataClient
      .from("tournament_matches")
      .select(
        "id,round,slot,participant_a_id,participant_b_id,winner_id,participant_a_score,participant_b_score,status,next_match_id,next_slot"
      )
      .eq("game_id", gameId)
      .order("round")
      .order("slot"),
  ])
  if (participantResult.error) throw new Error(participantResult.error.message)
  if (matchResult.error) throw new Error(matchResult.error.message)

  const participantRows = participantResult.data ?? []
  const participantIds = participantRows.map(
    (participant) => participant.user_id
  )
  const profileResult = participantIds.length
    ? await dataClient
        .from("profiles")
        .select("id,full_name,avatar_url")
        .in("id", participantIds)
    : { data: [], error: null }
  if (profileResult.error) throw new Error(profileResult.error.message)

  const profiles = new Map(
    (profileResult.data ?? []).map((profile) => [profile.id, profile])
  )
  const participants = participantRows.map((participant) => {
    const profile = profiles.get(participant.user_id)
    return {
      id: participant.user_id,
      fullName: profile?.full_name ?? "Player",
      avatarUrl: profile?.avatar_url ?? null,
      seedPosition: participant.seed_position,
      joinedAt: participant.joined_at,
    }
  })

  const normalizedMatches: TournamentMatch[] = (matchResult.data ?? []).map(
    (match) => ({
      id: match.id,
      round: match.round,
      slot: match.slot,
      participantAId: match.participant_a_id,
      participantBId: match.participant_b_id,
      winnerId: match.winner_id,
      participantAScore: match.participant_a_score,
      participantBScore: match.participant_b_score,
      status: match.status,
      nextMatchId: match.next_match_id,
      nextSlot: match.next_slot,
    })
  )

  const preview = normalizedMatches.length === 0
  let previewIndex = 0
  const previewFormat = new SingleEliminationFormat(
    () => `preview-${gameId}-${++previewIndex}`
  )
  const previewMatches: TournamentMatch[] =
    participantIds.length >= 2
      ? previewFormat.initialize(
          participantIds.map((userId, index) => ({ userId, seed: index + 1 }))
        ).matches
      : [
          {
            id: `preview-${gameId}-1`,
            round: 1,
            slot: 1,
            participantAId: participantIds[0] ?? null,
            participantBId: null,
            winnerId: null,
            status: "pending",
            nextMatchId: null,
            nextSlot: null,
          },
        ]
  const matches = preview ? previewMatches : normalizedMatches
  const seeds = preview
    ? Object.fromEntries(
        participantIds.map((userId, index) => [userId, index + 1])
      )
    : Object.fromEntries(
        participantRows.map((participant) => [
          participant.user_id,
          participant.seed_position,
        ])
      )
  const championId = normalizedMatches.find(
    (match) => match.nextMatchId === null && match.status === "complete"
  )?.winnerId

  return {
    id: game.id,
    name: game.name,
    description: game.description,
    status: game.status as GameStatus,
    maxParticipants: game.max_participants,
    randomizedAt: game.randomized_at,
    completedAt: game.completed_at,
    currentUserId: viewer.user.id,
    canManage: viewer.isAdmin || game.created_by === viewer.user.id,
    participants,
    matches,
    seeds,
    championId: championId ?? null,
    preview,
  }
}

export async function loadGameInvite(
  gameId: string
): Promise<GameInvite | null> {
  const viewer = await getCurrentViewer()
  if (!viewer) throw new Error("Authentication is required")

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("games")
    .select("created_by,status,invite_token")
    .eq("id", gameId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  if (!viewer.isAdmin && data.created_by !== viewer.user.id) return null
  if (!["open", "full"].includes(data.status)) return null

  return { inviteUrl: `${appUrl()}/join/${data.invite_token}` }
}
