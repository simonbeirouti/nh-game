"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import sharp from "sharp"
import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import {
  ACCEPTED_AVATAR_TYPES,
  AVATAR_BUCKET,
  MAX_AVATAR_SIZE,
  avatarObjectPath,
} from "@/lib/avatar-storage"
import { ensureUserProfile, getCurrentUser } from "@/lib/auth"
import {
  inviteTokenFromPath,
  safeOnboardingNextPath,
} from "@/lib/auth-redirect"
import { joinGameForUser } from "@/lib/game-join"
import { createAdminClient } from "@/lib/supabase/admin"

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
})

export async function completeOnboarding(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  const rawNext = formData.get("next")
  const next = safeOnboardingNextPath(
    typeof rawNext === "string" ? rawNext : null
  )
  if (!user?.email) {
    redirect(`/auth?next=${encodeURIComponent(next)}`)
  }

  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") })
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please enter a name between 2 and 80 characters.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  await ensureUserProfile(user)
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .single()
  if (error) return { ok: false, message: error.message }

  const inviteToken = inviteTokenFromPath(
    new URL(next, "https://colabs-games.invalid").pathname
  )
  if (inviteToken) {
    let destination: string
    try {
      const gameId = await joinGameForUser(user, inviteToken)
      destination = `/games/${gameId}?joined=1`
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : "Could not join game"
      destination = `/join/${inviteToken}?error=${encodeURIComponent(message)}`
    }
    redirect(destination)
  }

  redirect(next)
}

export async function updateProfile(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Sign in to update your profile." }

  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") })
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please enter a name between 2 and 80 characters.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id)
  if (error) return { ok: false, message: error.message }

  refresh()
  return { ok: true, message: "Profile updated." }
}

export async function updateProfileAvatar(
  formData: FormData
): Promise<ActionState<{ avatarUrl: string }>> {
  const user = await getCurrentUser()
  if (!user)
    return { ok: false, message: "Sign in to update your profile image." }

  const avatar = formData.get("avatar")
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { ok: false, message: "Choose an image to upload." }
  }
  if (avatar.size > MAX_AVATAR_SIZE) {
    return { ok: false, message: "Profile images must be 10 MB or smaller." }
  }
  if (!ACCEPTED_AVATAR_TYPES.has(avatar.type)) {
    return {
      ok: false,
      message: "Choose a supported phone image such as JPEG, PNG, or WebP.",
    }
  }

  let normalizedAvatar: Buffer
  try {
    normalizedAvatar = await sharp(await avatar.arrayBuffer(), {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(1024, 1024, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
  } catch {
    return {
      ok: false,
      message: "That image could not be read. Try another photo.",
    }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single()
  if (profileError) return { ok: false, message: profileError.message }

  const newPath = `${user.id}/${crypto.randomUUID()}.webp`
  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(newPath, normalizedAvatar, {
      contentType: "image/webp",
      upsert: false,
    })
  if (uploadError) return { ok: false, message: uploadError.message }

  const avatarUrl = admin.storage.from(AVATAR_BUCKET).getPublicUrl(newPath)
    .data.publicUrl
  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)

  if (updateError) {
    await admin.storage.from(AVATAR_BUCKET).remove([newPath])
    return { ok: false, message: updateError.message }
  }

  const previousPath = avatarObjectPath(profile.avatar_url, user.id)
  if (previousPath && previousPath !== newPath) {
    const { error: cleanupError } = await admin.storage
      .from(AVATAR_BUCKET)
      .remove([previousPath])
    if (cleanupError) {
      refresh()
      return {
        ok: true,
        message:
          "Profile image updated, but the previous file could not be removed.",
        data: { avatarUrl },
      }
    }
  }

  refresh()
  return {
    ok: true,
    message: "Profile image updated.",
    data: { avatarUrl },
  }
}

export async function removeProfileAvatar(): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user)
    return { ok: false, message: "Sign in to remove your profile image." }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single()
  if (profileError) return { ok: false, message: profileError.message }
  if (!profile.avatar_url)
    return { ok: true, message: "Profile image removed." }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
  if (updateError) return { ok: false, message: updateError.message }

  const previousPath = avatarObjectPath(profile.avatar_url, user.id)
  if (previousPath) {
    const { error: cleanupError } = await admin.storage
      .from(AVATAR_BUCKET)
      .remove([previousPath])
    if (cleanupError) {
      refresh()
      return {
        ok: true,
        message:
          "Profile image removed, but the old file could not be deleted.",
      }
    }
  }

  refresh()
  return { ok: true, message: "Profile image removed." }
}
