"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import { getCurrentViewer } from "@/lib/auth"
import { sendPushToUsers } from "@/lib/push"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createRandomizedOrder,
  RANDOMIZATION_ALGORITHM,
} from "@/lib/tournament/random"
import { singleEliminationFormat } from "@/lib/tournament/single-elimination"

const createGameSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  maxParticipants: z
    .union([z.literal(""), z.coerce.number().int().min(2).max(128)])
    .transform((value) => (value === "" ? null : value)),
  creatorParticipates: z.enum(["on"]).optional().transform(Boolean),
})

async function requireViewer() {
  const viewer = await getCurrentViewer()
  if (!viewer?.user.email) redirect("/auth")
  return viewer
}

async function requireGameManager(gameId: string) {
  const viewer = await requireViewer()
  const admin = createAdminClient()
  const { data: game, error } = await admin
    .from("games")
    .select("id,created_by")
    .eq("id", gameId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!game) throw new Error("Game not found")

  if (!viewer.isAdmin && game.created_by !== viewer.user.id) {
    throw new Error("Only the game organizer can make this change")
  }

  return {
    admin,
    game,
    user: viewer.user,
    actorId: viewer.isAdmin ? game.created_by : viewer.user.id,
  }
}

export async function createGame(
  _previous: ActionState<{ gameId: string }>,
  formData: FormData
): Promise<ActionState<{ gameId: string }>> {
  const { user } = await requireViewer()
  const parsed = createGameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    maxParticipants: formData.get("maxParticipants") ?? "",
    creatorParticipates: formData.get("creatorParticipates") ?? undefined,
  })
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("service_create_game", {
    p_creator_id: user.id,
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? "",
    p_max_participants: parsed.data.maxParticipants,
    p_creator_participates: parsed.data.creatorParticipates,
  })
  if (error) return { ok: false, message: error.message }

  const game = data as { id: string }
  revalidatePath("/dashboard")
  return { ok: true, message: "Game created.", data: { gameId: game.id } }
}

export async function startGame(formData: FormData) {
  const gameId = z.uuid().parse(formData.get("gameId"))
  const { admin, actorId } = await requireGameManager(gameId)

  const { data: participants, error: participantsError } = await admin
    .from("game_participants")
    .select("user_id")
    .eq("game_id", gameId)
    .order("joined_at")
  if (participantsError) throw new Error(participantsError.message)

  const participantIds = participants.map((participant) => participant.user_id)
  const randomization = createRandomizedOrder(participantIds)
  const state = singleEliminationFormat.initialize(randomization.participants)

  const { error } = await admin.rpc("service_finalize_game", {
    p_game_id: gameId,
    p_actor_id: actorId,
    p_algorithm_version: RANDOMIZATION_ALGORITHM,
    p_seed: randomization.seed,
    p_participant_snapshot: participantIds,
    p_ordered_participant_ids: randomization.participants.map(
      (participant) => participant.userId
    ),
    p_order_hash: randomization.orderHash,
    p_matches: state.matches,
  })
  if (error) throw new Error(error.message)

  after(() =>
    sendPushToUsers(participantIds, {
      title: "Your bracket is ready",
      body: "The draw has been locked. See your seed and first match.",
      url: `/games/${gameId}`,
    })
  )
  revalidatePath(`/games/${gameId}`)
  revalidatePath("/dashboard")
}

export async function recordMatchResult(formData: FormData) {
  const parsed = z
    .object({ gameId: z.uuid(), matchId: z.uuid(), winnerId: z.uuid() })
    .parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      winnerId: formData.get("winnerId"),
    })
  const { admin, actorId } = await requireGameManager(parsed.gameId)
  const { data: completed, error } = await admin.rpc(
    "service_record_match_result",
    {
      p_game_id: parsed.gameId,
      p_match_id: parsed.matchId,
      p_winner_id: parsed.winnerId,
      p_actor_id: actorId,
    }
  )
  if (error) throw new Error(error.message)

  const { data: participants } = await admin
    .from("game_participants")
    .select("user_id")
    .eq("game_id", parsed.gameId)
  const recipientIds =
    participants?.map((participant) => participant.user_id) ?? []
  after(() =>
    sendPushToUsers(recipientIds, {
      title: completed ? "Tournament complete" : "Bracket updated",
      body: completed
        ? "A champion has been crowned."
        : "A result was recorded and the next match may be ready.",
      url: `/games/${parsed.gameId}`,
    })
  )
  revalidatePath(`/games/${parsed.gameId}`)
  revalidatePath("/dashboard")
}

export async function archiveGame(formData: FormData) {
  const gameId = z.uuid().parse(formData.get("gameId"))
  const { admin, actorId } = await requireGameManager(gameId)
  const { error } = await admin.rpc("service_archive_game", {
    p_game_id: gameId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(error.message)

  const { data: participants } = await admin
    .from("game_participants")
    .select("user_id")
    .eq("game_id", gameId)
  after(() =>
    sendPushToUsers(
      participants?.map((participant) => participant.user_id) ?? [],
      {
        title: "Game archived",
        body: "This NH Games tournament has been archived.",
        url: `/games/${gameId}`,
      }
    )
  )
  revalidatePath(`/games/${gameId}`)
  revalidatePath("/dashboard")
}

export async function leaveOrRemoveParticipant(formData: FormData) {
  const viewer = await requireViewer()
  const actor = viewer.user
  const parsed = z
    .object({ gameId: z.uuid(), userId: z.uuid() })
    .parse({ gameId: formData.get("gameId"), userId: formData.get("userId") })
  const admin = createAdminClient()
  const { data: game } = await admin
    .from("games")
    .select("created_by")
    .eq("id", parsed.gameId)
    .maybeSingle()
  if (actor.id !== parsed.userId) {
    await requireGameManager(parsed.gameId)
  }
  const actorId = viewer.isAdmin && game ? game.created_by : actor.id
  const { error } = await admin.rpc("service_leave_game", {
    p_game_id: parsed.gameId,
    p_user_id: parsed.userId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/games/${parsed.gameId}`)
  revalidatePath("/dashboard")
  if (actor.id === parsed.userId) redirect("/dashboard")
}

const updateGameSchema = z.object({
  gameId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000),
  maxParticipants: z
    .union([z.literal(""), z.coerce.number().int().min(2).max(128)])
    .transform((value) => (value === "" ? null : value)),
})

export async function updateGame(formData: FormData) {
  const parsed = updateGameSchema.parse({
    gameId: formData.get("gameId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    maxParticipants: formData.get("maxParticipants") ?? "",
  })
  const { admin } = await requireGameManager(parsed.gameId)
  const { error } = await admin
    .from("games")
    .update({
      name: parsed.name,
      description: parsed.description || null,
      max_participants: parsed.maxParticipants,
    })
    .eq("id", parsed.gameId)

  if (error) throw new Error(error.message)
  revalidatePath(`/games/${parsed.gameId}`)
  revalidatePath("/dashboard")
}

export async function deleteGame(formData: FormData) {
  const gameId = z.uuid().parse(formData.get("gameId"))
  const { admin } = await requireGameManager(gameId)
  const { error } = await admin.from("games").delete().eq("id", gameId)
  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
