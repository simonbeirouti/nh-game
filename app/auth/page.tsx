import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthLoginForm } from "@/components/auth-login-form"
import { getCurrentUser, isOnboardingComplete } from "@/lib/auth"
import { onboardingPath, safeNextPath } from "@/lib/auth-redirect"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    mode?: "forgot" | "sign-in" | "sign-up"
    next?: string
  }>
}) {
  const { error, mode, next: requestedNext } = await searchParams
  const next = safeNextPath(requestedNext)
  const initialMode =
    mode === "forgot" || mode === "sign-up" || mode === "sign-in"
      ? mode
      : undefined
  const user = await getCurrentUser()
  if (user) {
    if (!(await isOnboardingComplete(user))) redirect(onboardingPath(next))
    redirect(next)
  }

  return (
    <AuthLoginForm authError={error} initialMode={initialMode} next={next} />
  )
}
