"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import { safeNextPath } from "@/lib/auth-redirect"
import { defaultDisplayName, getCurrentUser } from "@/lib/auth"
import { appUrl } from "@/lib/env"
import { joinGameForUser } from "@/lib/game-join"
import { sendPasswordRecoveryEmail } from "@/lib/password-recovery"
import { updatePasswordSchema } from "@/lib/password-validation"
import { resolveAppOrigin } from "@/lib/request-origin"
import { createClient } from "@/lib/supabase/server"

const passwordLoginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  next: z.string().optional(),
})

const passwordSignUpSchema = z
  .object({
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
    next: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })

const passwordRecoverySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
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

export async function signInWithPassword(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = passwordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })
  if (!parsed.success) return errors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { ok: false, message: "Invalid email or password." }
  redirect(safeNextPath(parsed.data.next))
}

export async function signUpWithPassword(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = passwordSignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    next: formData.get("next") ?? undefined,
  })
  if (!parsed.success) return errors(parsed.error)

  const next = safeNextPath(parsed.data.next)
  const redirectTo = new URL("/auth/confirm", await requestAppOrigin())
  redirectTo.searchParams.set("next", next)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: redirectTo.toString(),
      data: { full_name: defaultDisplayName(parsed.data.email) },
    },
  })

  if (error) {
    return {
      ok: false,
      message: "Could not create the account. Please check your details.",
    }
  }
  if (data.session) redirect(next)

  return {
    ok: true,
    message: "Check your email to confirm your account, then sign in.",
  }
}

export async function requestPasswordRecovery(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = passwordRecoverySchema.safeParse({
    email: formData.get("email"),
  })
  if (!parsed.success) return errors(parsed.error)

  try {
    await sendPasswordRecoveryEmail(parsed.data.email, await requestAppOrigin())
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not send reset email.",
    }
  }

  return {
    ok: true,
    message: "If that account exists, a password reset link has been sent.",
  }
}

export async function updatePassword(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })
  if (!parsed.success) return errors(parsed.error)

  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "The reset link is no longer valid." }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return { ok: false, message: error.message }
  redirect("/dashboard?password=updated")
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
  redirect(`/games/${gameId}?joined=1`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
