"use server"

import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export async function savePushSubscription(input: unknown): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Sign in before enabling notifications." }
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Invalid push subscription." }

  const supabase = await createClient()
  const { data: game } = await supabase.from("games").select("id").limit(1).maybeSingle()
  if (!game) {
    return {
      ok: false,
      message: "Join or create a game before enabling notifications.",
    }
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  )

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Notifications enabled on this device." }
}

export async function removePushSubscription(endpoint: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "You are not signed in." }
  const parsed = z.url().safeParse(endpoint)
  if (!parsed.success) return { ok: false, message: "Invalid push subscription." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data)
    .eq("user_id", user.id)

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Notifications disabled on this device." }
}
