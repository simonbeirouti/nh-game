import { expect, test, type Page } from "@playwright/test"

const cacheBuster = "colabs-games-query-v1"

type CachedQuery = {
  queryKey: unknown[]
  data: unknown
}

async function waitForOfflineShell(page: Page) {
  await page.goto("/offline")
  await page.evaluate(async () => navigator.serviceWorker.ready)
  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload()
  }
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
}

async function seedPersistedQueries(
  page: Page,
  userId: string,
  queries: CachedQuery[],
  timestamp = Date.now()
) {
  await page.evaluate(
    async ({ buster, cachedQueries, owner, savedAt }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("colabs-games")
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("query-cache")) {
            request.result.createObjectStore("query-cache")
          }
        }
      })
      const transaction = database.transaction("query-cache", "readwrite")
      const store = transaction.objectStore("query-cache")
      store.put(owner, "active-user")
      store.put(
        JSON.stringify({
          timestamp: savedAt,
          buster,
          clientState: {
            mutations: [],
            queries: cachedQueries.map(({ data, queryKey }) => ({
              dehydratedAt: savedAt,
              queryHash: JSON.stringify(queryKey),
              queryKey,
              state: {
                data,
                dataUpdateCount: 1,
                dataUpdatedAt: savedAt,
                error: null,
                errorUpdateCount: 0,
                errorUpdatedAt: 0,
                fetchFailureCount: 0,
                fetchFailureReason: null,
                fetchMeta: null,
                isInvalidated: false,
                status: "success",
                fetchStatus: "idle",
              },
            })),
          },
        }),
        `query-cache:${owner}`
      )
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
      database.close()
    },
    {
      buster: cacheBuster,
      cachedQueries: queries,
      owner: userId,
      savedAt: timestamp,
    }
  )
}

test("precaches the interactive offline shell without caching private responses", async ({
  page,
}) => {
  await waitForOfflineShell(page)

  const cachedUrls = await page.evaluate(async () => {
    const cacheNames = await caches.keys()
    const applicationCache = cacheNames.find(
      (name) => name === "colabs-games-static-v4"
    )
    if (!applicationCache) return { cacheNames, urls: [] }
    const requests = await (await caches.open(applicationCache)).keys()
    return { cacheNames, urls: requests.map((request) => request.url) }
  })

  expect(cachedUrls.cacheNames).toContain("colabs-games-static-v4")
  expect(cachedUrls.urls.some((url) => url.endsWith("/offline"))).toBeTruthy()
  expect(
    cachedUrls.urls.some(
      (url) => url.includes("/_next/static/") && url.endsWith(".js")
    )
  ).toBeTruthy()
  expect(
    cachedUrls.urls.some(
      (url) => url.includes("/_next/static/") && url.endsWith(".css")
    )
  ).toBeTruthy()
  expect(cachedUrls.urls.some((url) => url.includes("/api/"))).toBeFalsy()
})

test("renders saved catalog and game data read-only while offline", async ({
  context,
  page,
}) => {
  const userId = "offline-user"
  const gameId = "cached-game"
  await waitForOfflineShell(page)
  await seedPersistedQueries(page, userId, [
    {
      queryKey: ["games", "catalog", userId],
      data: [
        {
          id: gameId,
          name: "Saved championship",
          description: "Available without a connection",
          status: "open",
          maxParticipants: 16,
          participantCount: 4,
          createdAt: "2026-09-22T00:00:00.000Z",
          access: "member",
        },
        {
          id: "joinable-game",
          name: "Reconnect cup",
          description: null,
          status: "open",
          maxParticipants: 8,
          participantCount: 2,
          createdAt: "2026-09-22T00:00:00.000Z",
          access: "joinable",
        },
      ],
    },
    {
      queryKey: ["games", "detail", gameId],
      data: {
        id: gameId,
        name: "Saved championship",
        description: "Available without a connection",
        status: "open",
        maxParticipants: 16,
        randomizedAt: null,
        completedAt: null,
        currentUserId: userId,
        canManage: true,
        participants: [],
        matches: [],
        seeds: {},
        championId: null,
        preview: true,
      },
    },
  ])

  await context.setOffline(true)
  await page.goto("/dashboard")
  await expect(page.getByRole("heading", { name: "Saved games" })).toBeVisible()
  await expect(page.getByText("Saved championship")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Reconnect to join" })
  ).toBeDisabled()

  await page.goto(`/games/${gameId}`)
  await expect(
    page.getByRole("heading", { name: "Saved championship" })
  ).toBeVisible()
  await expect(page.getByText(/Offline read-only view/)).toBeVisible()
})

test("rejects expired snapshots and falls back for uncached routes", async ({
  context,
  page,
}) => {
  const userId = "expired-user"
  await waitForOfflineShell(page)
  await seedPersistedQueries(
    page,
    userId,
    [{ queryKey: ["games", "catalog", userId], data: [] }],
    Date.now() - 24 * 60 * 60 * 1_000 - 1
  )

  await context.setOffline(true)
  await page.goto("/dashboard")
  await expect(
    page.getByRole("heading", { name: "You are offline" })
  ).toBeVisible()

  await page.goto("/profile")
  await expect(
    page.getByRole("heading", { name: "You are offline" })
  ).toBeVisible()
})
