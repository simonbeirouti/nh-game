import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { createStore, del, get, set } from "idb-keyval"

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000
export const QUERY_CACHE_BUSTER = "colabs-games-query-v1"

const DATABASE_NAME = "colabs-games"
const STORE_NAME = "query-cache"
const ACTIVE_USER_KEY = "active-user"
const memoryStorage = new Map<string, string>()

let store: ReturnType<typeof createStore> | null = null

function indexedDbStore() {
  if (typeof indexedDB === "undefined") return null
  store ??= createStore(DATABASE_NAME, STORE_NAME)
  return store
}

async function getItem(key: string): Promise<string | null> {
  const database = indexedDbStore()
  if (!database) return memoryStorage.get(key) ?? null
  try {
    return (await get<string>(key, database)) ?? null
  } catch {
    store = null
    return memoryStorage.get(key) ?? null
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const database = indexedDbStore()
  if (!database) {
    memoryStorage.set(key, value)
    return
  }
  try {
    await set(key, value, database)
  } catch {
    store = null
    memoryStorage.set(key, value)
  }
}

async function removeItem(key: string): Promise<void> {
  const database = indexedDbStore()
  if (!database) {
    memoryStorage.delete(key)
    return
  }
  try {
    await del(key, database)
  } catch {
    store = null
    memoryStorage.delete(key)
  }
}

export function queryCacheKey(userId: string) {
  return `query-cache:${userId}`
}

export function createUserQueryPersister(userId: string) {
  return createAsyncStoragePersister({
    storage: { getItem, setItem, removeItem },
    key: queryCacheKey(userId),
    throttleTime: 1_000,
  })
}

export function shouldPersistQuery(query: {
  state: { status: string }
  meta?: Record<string, unknown>
}) {
  return query.state.status === "success" && query.meta?.persist === true
}

export async function markActiveQueryUser(userId: string): Promise<void> {
  await setItem(ACTIVE_USER_KEY, userId)
}

export async function clearPersistedQueryState(userId: string): Promise<void> {
  await removeItem(queryCacheKey(userId))
  if ((await getItem(ACTIVE_USER_KEY)) === userId) {
    await removeItem(ACTIVE_USER_KEY)
  }
}

export async function readActivePersistedClient() {
  const userId = await getItem(ACTIVE_USER_KEY)
  if (!userId) return null
  const persister = createUserQueryPersister(userId)
  const client = await persister.restoreClient()
  if (!client) return null
  if (
    client.buster !== QUERY_CACHE_BUSTER ||
    Date.now() - client.timestamp > QUERY_CACHE_MAX_AGE
  ) {
    await persister.removeClient()
    await removeItem(ACTIVE_USER_KEY)
    return null
  }
  return { userId, client }
}

export function resetQueryPersistenceForTests() {
  store = null
  memoryStorage.clear()
}
