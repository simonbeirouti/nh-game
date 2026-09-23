"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import {
  environmentManager,
  onlineManager,
  QueryClient,
  useQueryClient,
} from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"

import { invalidateGameEvent } from "@/lib/games/invalidation"
import type { GameInvalidationEvent } from "@/lib/games/types"
import {
  createUserQueryPersister,
  markActiveQueryUser,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  shouldPersistQuery,
} from "@/lib/query-persistence"
import { createClient } from "@/lib/supabase/client"

const browserQueryClients = new Map<string, QueryClient>()

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: QUERY_CACHE_MAX_AGE,
        retry: 1,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: {
        networkMode: "online",
      },
    },
  })
}

export function getQueryClient(userId: string) {
  if (environmentManager.isServer()) return makeQueryClient()
  const existing = browserQueryClients.get(userId)
  if (existing) return existing

  const queryClient = makeQueryClient()
  browserQueryClients.set(userId, queryClient)
  return queryClient
}

function QueryRealtime({ userId }: { userId: string }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    let disposed = false
    const receive = (message: { payload?: unknown }) => {
      const event = message.payload as
        Partial<GameInvalidationEvent> | undefined
      if (!event?.entity || !event.operation) return
      invalidateGameEvent(queryClient, {
        entity: event.entity,
        operation: event.operation,
        gameId: typeof event.gameId === "string" ? event.gameId : null,
      })
    }
    const publicChannel = supabase
      .channel("games:public", { config: { private: true } })
      .on("broadcast", { event: "invalidate" }, receive)
    const userChannel = supabase
      .channel(`user:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "invalidate" }, receive)

    void supabase.realtime.setAuth().then(() => {
      if (disposed) return
      publicChannel.subscribe()
      userChannel.subscribe()
    })

    return () => {
      disposed = true
      void supabase.removeChannel(publicChannel)
      void supabase.removeChannel(userChannel)
    }
  }, [queryClient, userId])

  return null
}

export function QueryProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId: string
}) {
  const queryClient = getQueryClient(userId)
  const persister = useMemo(() => createUserQueryPersister(userId), [userId])

  useEffect(() => {
    void markActiveQueryUser(userId)
    onlineManager.setOnline(navigator.onLine)
    const setOnline = () => onlineManager.setOnline(true)
    const setOffline = () => onlineManager.setOnline(false)
    window.addEventListener("online", setOnline)
    window.addEventListener("offline", setOffline)
    return () => {
      window.removeEventListener("online", setOnline)
      window.removeEventListener("offline", setOffline)
    }
  }, [userId])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: QUERY_CACHE_BUSTER,
        maxAge: QUERY_CACHE_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      <QueryRealtime userId={userId} />
      {children}
    </PersistQueryClientProvider>
  )
}
