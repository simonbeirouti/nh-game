"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import { safeNextPath } from "@/lib/auth-redirect"
import { defaultDisplayName, getCurrentUser } from "@/lib/auth"
import { appUrl } from "@/lib/env"
import { joinGameForUser } from "@/lib/game-join"
import { resolveAppOrigin } from "@/lib/request-origin"
import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  next: z.string().optional(),
})

function errors(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  }
}

async function requestAppOrigin(): Promise<string> {
  return resolveAppOrigin(appUrl(), (await headers()).get("origin"))
}

export async function requestLoginLink(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  })
  if (!parsed.success) return errors(parsed.error)

  const supabase = await createClient()
  const origin = await requestAppOrigin()
  const redirectTo = new URL("/auth/confirm", origin)
  redirectTo.searchParams.set("next", safeNextPath(parsed.data.next))
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo.toString(),
      data: { full_name: defaultDisplayName(parsed.data.email) },
    },
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true, message: "Check your email for the secure sign-in link." }
}

export async function joinAuthenticatedGame(formData: FormData) {
  const inviteToken = z.uuid().parse(formData.get("inviteToken"))
  const user = await getCurrentUser()
  if (!user?.email)
    redirect(`/auth?next=${encodeURIComponent(`/join/${inviteToken}`)}`)

  let gameId: string
  try {
    gameId = await joinGameForUser(user, inviteToken)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not join game"
    redirect(`/join/${inviteToken}?error=${encodeURIComponent(message)}`)
  }
  redirect(`/games/${gameId}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
