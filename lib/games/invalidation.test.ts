import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { invalidateGameEvent } from "./invalidation"
import { gameKeys } from "./queries"

describe("game invalidations", () => {
  it("invalidates the catalog and affected detail without touching another game", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(gameKeys.catalog("viewer"), [])
    queryClient.setQueryData(gameKeys.detail("affected"), { id: "affected" })
    queryClient.setQueryData(gameKeys.detail("other"), { id: "other" })

    invalidateGameEvent(queryClient, {
      entity: "match",
      operation: "UPDATE",
      gameId: "affected",
    })
    await Promise.resolve()

    expect(
      queryClient.getQueryState(gameKeys.catalog("viewer"))?.isInvalidated
    ).toBe(true)
    expect(
      queryClient.getQueryState(gameKeys.detail("affected"))?.isInvalidated
    ).toBe(true)
    expect(
      queryClient.getQueryState(gameKeys.detail("other"))?.isInvalidated
    ).toBe(false)
  })
})
