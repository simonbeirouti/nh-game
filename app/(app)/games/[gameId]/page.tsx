import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

import { GamePageContent } from "@/components/game-page-content"
import { gameKeys } from "@/lib/games/queries"
import { loadGameDetail } from "@/lib/games/server"

export const metadata: Metadata = { title: "Game" }

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ joined?: string }>
}) {
  const { gameId } = await params
  const { joined } = await searchParams
  const game = await loadGameDetail(gameId)
  if (!game) notFound()

  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: async () => game,
    meta: { persist: true },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GamePageContent gameId={gameId} joined={joined === "1"} />
    </HydrationBoundary>
  )
}
