import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

import { DashboardGames } from "@/components/dashboard-games"
import { getCurrentViewer } from "@/lib/auth"
import { onboardingPath } from "@/lib/auth-redirect"
import { gameKeys } from "@/lib/games/queries"
import { loadGameCatalog } from "@/lib/games/server"

export const metadata: Metadata = { title: "Games" }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ joinError?: string; password?: string }>
}) {
  const { joinError, password } = await searchParams
  const viewer = (await getCurrentViewer())!
  if (!viewer.onboardingComplete) redirect(onboardingPath("/dashboard"))
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: gameKeys.catalog(viewer.user.id),
    queryFn: loadGameCatalog,
    meta: { persist: true },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardGames
        userId={viewer.user.id}
        isAdmin={viewer.isAdmin}
        joinError={joinError}
        passwordUpdated={password === "updated"}
      />
    </HydrationBoundary>
  )
}
