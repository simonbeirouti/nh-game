import { queryOptions } from "@tanstack/react-query"

import type { GameCatalogItem, GameDetail, GameInvite } from "./types"

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  })
  if (!response.ok) {
    throw new Error(
      response.status === 404 ? "Not found" : "Could not load data"
    )
  }
  return (await response.json()) as T
}

export const gameKeys = {
  all: ["games"] as const,
  catalogs: () => ["games", "catalog"] as const,
  catalog: (userId: string) => ["games", "catalog", userId] as const,
  details: () => ["games", "detail"] as const,
  detail: (gameId: string) => ["games", "detail", gameId] as const,
  invite: (gameId: string) => ["games", "invite", gameId] as const,
}

export function gameCatalogOptions(userId: string) {
  return queryOptions({
    queryKey: gameKeys.catalog(userId),
    queryFn: ({ signal }) => getJson<GameCatalogItem[]>("/api/games", signal),
    meta: { persist: true },
  })
}

export function gameDetailOptions(gameId: string) {
  return queryOptions({
    queryKey: gameKeys.detail(gameId),
    queryFn: ({ signal }) =>
      getJson<GameDetail>(`/api/games/${encodeURIComponent(gameId)}`, signal),
    meta: { persist: true },
  })
}

export function gameInviteOptions(gameId: string, enabled: boolean) {
  return queryOptions({
    queryKey: gameKeys.invite(gameId),
    queryFn: ({ signal }) =>
      getJson<GameInvite>(
        `/api/games/${encodeURIComponent(gameId)}/invite`,
        signal
      ),
    enabled,
    meta: { persist: false },
  })
}
