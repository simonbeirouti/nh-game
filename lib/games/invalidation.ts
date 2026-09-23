import type { QueryClient } from "@tanstack/react-query"

import { gameKeys } from "./queries"
import type { GameInvalidationEvent } from "./types"

export function invalidateGameEvent(
  queryClient: QueryClient,
  event: GameInvalidationEvent
) {
  void queryClient.invalidateQueries({ queryKey: gameKeys.catalogs() })
  if (event.gameId) {
    void queryClient.invalidateQueries({
      queryKey: gameKeys.detail(event.gameId),
    })
    void queryClient.invalidateQueries({
      queryKey: gameKeys.invite(event.gameId),
    })
  }
}
