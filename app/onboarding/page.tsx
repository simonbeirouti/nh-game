import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OnboardingForm } from "@/components/onboarding-form"
import { getCurrentUser } from "@/lib/auth"
import {
  inviteTokenFromPath,
  safeOnboardingNextPath,
} from "@/lib/auth-redirect"
import { defaultDisplayName, ensureUserProfile } from "@/lib/auth"
import { loadInvitedGame } from "@/lib/games/invite"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata: Metadata = { title: "Set up your profile" }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next: requestedNext } = await searchParams
  const next = safeOnboardingNextPath(requestedNext)
  const user = await getCurrentUser()
  if (!user?.email) redirect(`/auth?next=${encodeURIComponent(next)}`)

  await ensureUserProfile(user)
  const { data: profile, error } = await createAdminClient()
    .from("profiles")
    .select("full_name,avatar_url,onboarding_completed_at")
    .eq("id", user.id)
    .single()
  if (error) throw new Error(error.message)
  if (profile.onboarding_completed_at) redirect(next)

  const inviteToken = inviteTokenFromPath(
    new URL(next, "https://colabs-games.invalid").pathname
  )
  const game = inviteToken ? await loadInvitedGame(inviteToken) : null

  return (
    <OnboardingForm
      initialName={profile.full_name || defaultDisplayName(user.email)}
      avatarUrl={profile.avatar_url}
      email={user.email}
      gameName={game?.name ?? null}
      next={next}
    />
  )
}
