"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { ActionState } from "@/lib/action-state"
import { getCurrentViewer } from "@/lib/auth"
import { joinGameForUser } from "@/lib/game-join"
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

const moveParticipantSchema = z.object({
  gameId: z.uuid(),
  userId: z.uuid(),
  targetSeed: z.coerce.number().int().positive(),
})

const matchResultSchema = z.object({
  gameId: z.uuid(),
  matchId: z.uuid(),
  winnerId: z.uuid(),
})

const matchScoreSchema = z.object({
  gameId: z.uuid(),
  matchId: z.uuid(),
  participantAScore: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(999)])
    .transform((value) => (value === "" ? null : value)),
  participantBScore: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(999)])
    .transform((value) => (value === "" ? null : value)),
})

function actionFailure(error: unknown, fallback: string): ActionState {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  }
}

function revalidateManagedGame(gameId: string) {
  revalidatePath(`/games/${gameId}`)
  revalidatePath("/admin")
  revalidatePath("/dashboard")
}

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

export async function joinPublicGame(formData: FormData) {
  const parsedGameId = z.uuid().safeParse(formData.get("gameId"))
  if (!parsedGameId.success) {
    redirect(
      `/dashboard?joinError=${encodeURIComponent("This game is not available to join")}`
    )
  }

  const { user } = await requireViewer()
  const admin = createAdminClient()
  const { data: game, error } = await admin
    .from("games")
    .select("invite_token")
    .eq("id", parsedGameId.data)
    .eq("status", "open")
    .maybeSingle()

  if (error || !game) {
    redirect(
      `/dashboard?joinError=${encodeURIComponent("This game is no longer available to join")}`
    )
  }

  let gameId: string
  try {
    gameId = await joinGameForUser(user, game.invite_token)
  } catch (joinError) {
    const message =
      joinError instanceof Error ? joinError.message : "Could not join game"
    redirect(`/dashboard?joinError=${encodeURIComponent(message)}`)
  }

  revalidatePath("/dashboard")
  redirect(`/games/${gameId}?joined=1`)
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

export async function moveGameParticipant(
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = moveParticipantSchema.parse({
      gameId: formData.get("gameId"),
      userId: formData.get("userId"),
      targetSeed: formData.get("targetSeed"),
    })
    const { admin } = await requireGameManager(parsed.gameId)
    const { error } = await admin.rpc("service_admin_reseed_participant", {
      p_game_id: parsed.gameId,
      p_user_id: parsed.userId,
      p_target_seed: parsed.targetSeed,
    })
    if (error) throw new Error(error.message)
    revalidateManagedGame(parsed.gameId)
    return { ok: true, message: "Seed order updated." }
  } catch (error) {
    return actionFailure(error, "Could not move participant.")
  }
}

export async function recordGameMatchResult(
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = matchResultSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      winnerId: formData.get("winnerId"),
    })
    await recordMatchResult(formData)
    revalidateManagedGame(parsed.gameId)
    return { ok: true, message: "Result recorded." }
  } catch (error) {
    return actionFailure(error, "Could not record result.")
  }
}

export async function correctGameMatchResult(
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = matchResultSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      winnerId: formData.get("winnerId"),
    })
    const { admin } = await requireGameManager(parsed.gameId)
    const { error } = await admin.rpc("service_admin_correct_match_result", {
      p_game_id: parsed.gameId,
      p_match_id: parsed.matchId,
      p_winner_id: parsed.winnerId,
    })
    if (error) throw new Error(error.message)
    revalidateManagedGame(parsed.gameId)
    return {
      ok: true,
      message: "Result corrected; dependent results were cleared.",
    }
  } catch (error) {
    return actionFailure(error, "Could not correct result.")
  }
}

export async function updateGameMatchScore(
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = matchScoreSchema.parse({
      gameId: formData.get("gameId"),
      matchId: formData.get("matchId"),
      participantAScore: formData.get("participantAScore") ?? "",
      participantBScore: formData.get("participantBScore") ?? "",
    })
    const { admin } = await requireGameManager(parsed.gameId)
    const { error } = await admin.rpc("service_admin_update_match_score", {
      p_game_id: parsed.gameId,
      p_match_id: parsed.matchId,
      p_participant_a_score: parsed.participantAScore,
      p_participant_b_score: parsed.participantBScore,
    })
    if (error) throw new Error(error.message)
    revalidateManagedGame(parsed.gameId)
    return { ok: true, message: "Score updated." }
  } catch (error) {
    return actionFailure(error, "Could not update score.")
  }
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
        body: "This CoLabs Games tournament has been archived.",
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
