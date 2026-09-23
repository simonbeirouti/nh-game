import "fake-indexeddb/auto"

import { dehydrate, QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it } from "vitest"

import {
  clearPersistedQueryState,
  createUserQueryPersister,
  markActiveQueryUser,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  readActivePersistedClient,
  resetQueryPersistenceForTests,
  shouldPersistQuery,
} from "./query-persistence"

afterEach(() => {
  resetQueryPersistenceForTests()
})

function persistedClient(data: string, timestamp = Date.now()) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(["value"], data)
  return {
    timestamp,
    buster: QUERY_CACHE_BUSTER,
    clientState: dehydrate(queryClient),
  }
}

describe("query persistence", () => {
  it("isolates persisted clients by user and clears only the signed-out user", async () => {
    const first = createUserQueryPersister("persistence-user-one")
    const second = createUserQueryPersister("persistence-user-two")
    await first.persistClient(persistedClient("one"))
    await second.persistClient(persistedClient("two"))
    await markActiveQueryUser("persistence-user-one")

    expect((await first.restoreClient())?.clientState.queries).toHaveLength(1)
    expect((await second.restoreClient())?.clientState.queries).toHaveLength(1)

    await clearPersistedQueryState("persistence-user-one")
    expect(await first.restoreClient()).toBeUndefined()
    expect((await second.restoreClient())?.clientState.queries).toHaveLength(1)
    expect(await readActivePersistedClient()).toBeNull()
  })

  it("rejects and removes expired persisted data", async () => {
    const userId = "persistence-expired-user"
    const persister = createUserQueryPersister(userId)
    await persister.persistClient(
      persistedClient("expired", Date.now() - QUERY_CACHE_MAX_AGE - 1)
    )
    await markActiveQueryUser(userId)

    expect(await readActivePersistedClient()).toBeNull()
    expect(await persister.restoreClient()).toBeUndefined()
  })

  it("rejects snapshots written by a different persistence version", async () => {
    const userId = "persistence-old-version-user"
    const persister = createUserQueryPersister(userId)
    await persister.persistClient({
      ...persistedClient("old"),
      buster: "colabs-games-query-old",
    })
    await markActiveQueryUser(userId)

    expect(await readActivePersistedClient()).toBeNull()
    expect(await persister.restoreClient()).toBeUndefined()
  })

  it("persists only successful queries explicitly marked for persistence", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryDefaults(["persisted"], { meta: { persist: true } })
    queryClient.setQueryDefaults(["private"], { meta: { persist: false } })
    queryClient.setQueryData(["persisted"], "yes")
    queryClient.setQueryData(["private"], "no")

    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: shouldPersistQuery,
    })
    expect(state.queries.map((query) => query.queryKey)).toEqual([
      ["persisted"],
    ])
    expect(state.mutations).toEqual([])
  })

  it("falls back to in-memory storage when IndexedDB is unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")
    Reflect.deleteProperty(globalThis, "indexedDB")
    resetQueryPersistenceForTests()

    try {
      const persister = createUserQueryPersister("memory-user")
      await persister.persistClient(persistedClient("memory"))
      expect(
        (await persister.restoreClient())?.clientState.queries
      ).toHaveLength(1)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "indexedDB", descriptor)
    }
  })
})
