"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { archiveGame, recordMatchResult, startGame } from "@/app/actions/games"
import type { ActionState } from "@/lib/action-state"
import { requireAdmin } from "@/lib/auth"
import { appUrl } from "@/lib/env"
import { sendPasswordRecoveryEmail } from "@/lib/password-recovery"
import { resolveAppOrigin } from "@/lib/request-origin"
import { createAdminClient } from "@/lib/supabase/admin"

const idSchema = z.object({ id: z.uuid() })
const gameIdSchema = z.object({ gameId: z.uuid() })
const participantSchema = z.object({ gameId: z.uuid(), userId: z.uuid() })
const moveParticipantSchema = participantSchema.extend({
  targetSeed: z.coerce.number().int().positive(),
})
const resultSchema = z.object({
  gameId: z.uuid(),
  matchId: z.uuid(),
  winnerId: z.uuid(),
})
const scoreSchema = z.object({
  gameId: z.uuid(),
  matchId: z.uuid(),
  participantAScore: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(999)])
    .transform((value) => (value === "" ? null : value)),
  participantBScore: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(999)])
    .transform((value) => (value === "" ? null : value)),
})
const updateGameSchema = z.object({
  gameId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000),
  maxParticipants: z
    .union([z.literal(""), z.coerce.number().int().min(2).max(128)])
    .transform((value) => (value === "" ? null : value)),
})

function failure(error: unknown, fallback: string): ActionState {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  }
}

function revalidateAdminGame(gameId: string) {
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath(`/games/${gameId}`)
}

async function requestOrigin(): Promise<string> {
  return resolveAppOrigin(appUrl(), (await headers()).get("origin"))
}

export async function sendAdminPasswordRecovery(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const { id } = idSchema.parse({ id: formData.get("id") })
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (error) throw error
    if (!data.user?.email) throw new Error("This account has no email address")
    await sendPasswordRecoveryEmail(data.user.email, await requestOrigin())
    return { ok: true, message: `Password reset sent to ${data.user.email}.` }
  } catch (error) {
    return failure(error, "Could not send password reset.")
  }
}

export async function softDeleteAdminUser(
  formData: FormData
): Promise<ActionState> {
  try {
    const viewer = await requireAdmin()
    const { id } = idSchema.parse({ id: formData.get("id") })
    if (id === viewer.user.id)
      throw new Error("You cannot delete your own account")

    const admin = createAdminClient()
    const { data: role, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", id)
      .maybeSingle()
    if (roleError) throw new Error(roleError.message)

    if (role?.role === "admin") {
      const { count, error } = await admin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin")
      if (error) throw new Error(error.message)
      if ((count ?? 0) <= 1)
        throw new Error("The last administrator cannot be deleted")
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(id, true)
    if (deleteError) throw deleteError
    const { error: cleanupError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", id)
    if (cleanupError) throw new Error(cleanupError.message)

    revalidatePath("/admin")
    return {
      ok: true,
      message: "Account access removed; game history was preserved.",
    }
  } catch (error) {
    return failure(error, "Could not delete user.")
  }
}

export async function updateAdminGame(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = updateGameSchema.parse({
      gameId: formData.get("gameId"),
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      maxParticipants: formData.get("maxParticipants") ?? "",
    })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_update_game", {
      p_game_id: parsed.gameId,
      p_name: parsed.name,
      p_description: parsed.description,
      p_max_participants: parsed.maxParticipants,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Game details updated." }
  } catch (error) {
    return failure(error, "Could not update game.")
  }
}

export async function addAdminParticipant(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = participantSchema.parse({
      gameId: formData.get("gameId"),
      userId: formData.get("userId"),
    })
    const admin = createAdminClient()
    const { data: account, error: accountError } =
      await admin.auth.admin.getUserById(parsed.userId)
    if (accountError) throw accountError
    if (!account.user || account.user.deleted_at) {
      throw new Error("Only an active account can be added")
    }
    const { error } = await admin.rpc("service_admin_add_participant", {
      p_game_id: parsed.gameId,
      p_user_id: parsed.userId,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Participant added." }
  } catch (error) {
    return failure(error, "Could not add participant.")
  }
}

export async function removeAdminParticipant(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = participantSchema.parse({
      gameId: formData.get("gameId"),
      userId: formData.get("userId"),
    })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_remove_participant", {
      p_game_id: parsed.gameId,
      p_user_id: parsed.userId,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Participant removed." }
  } catch (error) {
    return failure(error, "Could not remove participant.")
  }
}

export async function moveAdminParticipant(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = moveParticipantSchema.parse({
      gameId: formData.get("gameId"),
      userId: formData.get("userId"),
      targetSeed: formData.get("targetSeed"),
    })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_reseed_participant", {
      p_game_id: parsed.gameId,
      p_user_id: parsed.userId,
      p_target_seed: parsed.targetSeed,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Seed order updated." }
  } catch (error) {
    return failure(error, "Could not move participant.")
  }
}

export async function updateAdminMatchScore(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = scoreSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      participantAScore: formData.get("participantAScore") ?? "",
      participantBScore: formData.get("participantBScore") ?? "",
    })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_update_match_score", {
      p_game_id: parsed.gameId,
      p_match_id: parsed.matchId,
      p_participant_a_score: parsed.participantAScore,
      p_participant_b_score: parsed.participantBScore,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Score updated." }
  } catch (error) {
    return failure(error, "Could not update score.")
  }
}

export async function startAdminGame(formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = gameIdSchema.parse({ gameId: formData.get("gameId") })
    await startGame(formData)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Draw created." }
  } catch (error) {
    return failure(error, "Could not start game.")
  }
}

export async function resetAdminGame(formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const { gameId } = gameIdSchema.parse({ gameId: formData.get("gameId") })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_reset_game", {
      p_game_id: gameId,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(gameId)
    return { ok: true, message: "Draw and results reset." }
  } catch (error) {
    return failure(error, "Could not reset game.")
  }
}

export async function archiveAdminGame(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = gameIdSchema.parse({ gameId: formData.get("gameId") })
    await archiveGame(formData)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Game archived." }
  } catch (error) {
    return failure(error, "Could not archive game.")
  }
}

export async function unarchiveAdminGame(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const { gameId } = gameIdSchema.parse({ gameId: formData.get("gameId") })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_unarchive_game", {
      p_game_id: gameId,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(gameId)
    return { ok: true, message: "Game restored." }
  } catch (error) {
    return failure(error, "Could not restore game.")
  }
}

export async function recordAdminMatchResult(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = resultSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      winnerId: formData.get("winnerId"),
    })
    await recordMatchResult(formData)
    revalidateAdminGame(parsed.gameId)
    return { ok: true, message: "Result recorded." }
  } catch (error) {
    return failure(error, "Could not record result.")
  }
}

export async function correctAdminMatchResult(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = resultSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      winnerId: formData.get("winnerId"),
    })
    const admin = createAdminClient()
    const { error } = await admin.rpc("service_admin_correct_match_result", {
      p_game_id: parsed.gameId,
      p_match_id: parsed.matchId,
      p_winner_id: parsed.winnerId,
    })
    if (error) throw new Error(error.message)
    revalidateAdminGame(parsed.gameId)
    return {
      ok: true,
      message: "Result corrected; dependent results were cleared.",
    }
  } catch (error) {
    return failure(error, "Could not correct result.")
  }
}

export async function deleteAdminGame(
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
    const { gameId } = gameIdSchema.parse({ gameId: formData.get("gameId") })
    const admin = createAdminClient()
    const { error } = await admin.from("games").delete().eq("id", gameId)
    if (error) throw new Error(error.message)
    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return { ok: true, message: "Game permanently deleted." }
  } catch (error) {
    return failure(error, "Could not delete game.")
  }
}
