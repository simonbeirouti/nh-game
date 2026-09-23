import type { GameAccess, GameCatalogItem } from "./types"
import type { GameStatus } from "../tournament/types"

export type GameCatalogRow = {
  id: string
  name: string
  description: string | null
  status: GameStatus
  created_by: string
  max_participants: number | null
  created_at: string
  game_participants: { count: number }[]
}

export function toGameCatalogItem(
  row: GameCatalogRow,
  access: GameAccess
): GameCatalogItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    maxParticipants: row.max_participants,
    participantCount: row.game_participants?.[0]?.count ?? 0,
    createdAt: row.created_at,
    access,
  }
}

export function mergeVisibleGameCatalog(
  memberRows: GameCatalogRow[],
  publicRows: GameCatalogRow[],
  userId: string
) {
  const games = new Map<string, GameCatalogItem>()
  for (const row of memberRows) {
    games.set(
      row.id,
      toGameCatalogItem(row, row.created_by === userId ? "owner" : "member")
    )
  }
  for (const row of publicRows) {
    if (!games.has(row.id)) {
      games.set(row.id, toGameCatalogItem(row, "joinable"))
    }
  }

  return [...games.values()].toSorted(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
}
