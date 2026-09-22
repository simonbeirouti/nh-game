import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"

import { adminEmail } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type AppRole = "admin" | "user"

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentViewer = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null

  await ensureUserProfile(user)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const role: AppRole = data?.role === "admin" ? "admin" : "user"
  return { user, role, isAdmin: role === "admin" }
})

export async function requireAdmin() {
  const viewer = await getCurrentViewer()
  if (!viewer?.isAdmin) throw new Error("Administrator access is required")
  return viewer
}

export function defaultDisplayName(email: string): string {
  const candidate = email
    .split("@")[0]
    .replace(/[._+-]+/g, " ")
    .trim()
  return candidate.length >= 2 ? candidate : "Player"
}

export async function ensureUserProfile(user: User): Promise<string> {
  if (!user.email) throw new Error("The signed-in account has no email address")

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)
  if (profile) return profile.full_name

  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""
  const fullName =
    metadataName.length >= 2 ? metadataName : defaultDisplayName(user.email)
  const { error } = await admin.from("profiles").insert({
    id: user.id,
    full_name: fullName,
  })
  if (error && error.code !== "23505") throw new Error(error.message)
  return fullName
}

export async function bootstrapFirstAdmin(user: User): Promise<void> {
  if (user.email?.toLowerCase() !== adminEmail()) return

  const admin = createAdminClient()
  const { error } = await admin.rpc("service_bootstrap_admin", {
    p_user_id: user.id,
  })
  if (error) throw new Error(error.message)
}
