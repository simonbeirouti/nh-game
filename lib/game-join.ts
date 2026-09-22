import "server-only"

import { after } from "next/server"
import type { User } from "@supabase/supabase-js"

import { ensureUserProfile } from "@/lib/auth"
import { sendPushToUsers } from "@/lib/push"
import { createAdminClient } from "@/lib/supabase/admin"

export async function joinGameForUser(user: User, inviteToken: string) {
  const fullName = await ensureUserProfile(user)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("service_join_game", {
    p_user_id: user.id,
    p_full_name: fullName,
    p_invite_token: inviteToken,
  })
  if (error) throw new Error(error.message)

  const gameId = String(data)
  const { data: game } = await admin
    .from("games")
    .select("name,created_by")
    .eq("id", gameId)
    .single()
  if (game) {
    after(() =>
      sendPushToUsers([user.id, game.created_by], {
        title: "Player joined",
        body: `${fullName} joined ${game.name}.`,
        url: `/games/${gameId}`,
      })
    )
  }

  return gameId
}
