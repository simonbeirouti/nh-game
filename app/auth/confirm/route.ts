import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { bootstrapFirstAdmin, ensureUserProfile } from "@/lib/auth"
import { inviteTokenFromPath, safeNextPath } from "@/lib/auth-redirect"
import { appUrl } from "@/lib/env"
import { joinGameForUser } from "@/lib/game-join"
import { resolveAppOrigin } from "@/lib/request-origin"
import { createClient } from "@/lib/supabase/server"

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "recovery",
])

function errorDestination(origin: string, next: string, error: string) {
  if (inviteTokenFromPath(next)) {
    const destination = new URL(next, origin)
    destination.searchParams.set(
      "error",
      error === "setup-failed"
        ? "We could not finish setting up your account. Please try again."
        : "The sign-in link is invalid or has expired. Please try again."
    )
    return destination
  }

  const destination = new URL("/auth", origin)
  destination.searchParams.set("error", error)
  destination.searchParams.set("next", next)
  return destination
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const requestHost = request.headers.get("host")
  const origin = resolveAppOrigin(
    appUrl(),
    requestHost ? `${url.protocol}//${requestHost}` : null
  )
  const code = url.searchParams.get("code")
  const flowId = url.searchParams.get("sb_flow_id")
  const tokenHash = url.searchParams.get("token_hash")
  const otpType = url.searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(url.searchParams.get("next"))
  const inviteToken = inviteTokenFromPath(next)
  const supabase = await createClient()

  let authError: Error | null = null
  if (tokenHash && otpType && EMAIL_OTP_TYPES.has(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    })
    authError = error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined
    )
    authError = error
  } else {
    return NextResponse.redirect(errorDestination(origin, next, "invalid-link"))
  }

  if (authError) {
    return NextResponse.redirect(errorDestination(origin, next, "expired-link"))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.redirect(errorDestination(origin, next, "missing-user"))
  }

  try {
    await ensureUserProfile(user)
    await bootstrapFirstAdmin(user)
  } catch {
    await supabase.auth.signOut()
    return NextResponse.redirect(errorDestination(origin, next, "setup-failed"))
  }

  if (inviteToken) {
    try {
      const gameId = await joinGameForUser(user, inviteToken)
      return NextResponse.redirect(new URL(`/games/${gameId}?joined=1`, origin))
    } catch (error) {
      const destination = new URL(next, origin)
      destination.searchParams.set(
        "error",
        error instanceof Error ? error.message : "Could not join game"
      )
      return NextResponse.redirect(destination)
    }
  }

  return NextResponse.redirect(new URL(next, origin))
}
