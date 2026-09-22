import "server-only"

import type { User } from "@supabase/supabase-js"

import { aggregateAdminConsoleData } from "@/lib/admin-aggregation"
import type { AdminConsoleData } from "@/lib/admin-types"
import { appUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

async function listAllActiveAuthUsers(): Promise<User[]> {
  const admin = createAdminClient()
  const perPage = 1000
  const users: User[] = []

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users.filter((user) => !user.deleted_at))
    if (data.users.length < perPage || users.length >= data.total) break
  }

  return users
}

export async function getAdminConsoleData(): Promise<AdminConsoleData> {
  const admin = createAdminClient()
  const [
    authUsers,
    profilesResult,
    rolesResult,
    pushSubscriptionsResult,
    gamesResult,
    participantsResult,
    matchesResult,
  ] = await Promise.all([
    listAllActiveAuthUsers(),
    admin.from("profiles").select("id,full_name,avatar_url,created_at"),
    admin.from("user_roles").select("user_id,role"),
    admin.from("push_subscriptions").select("user_id"),
    admin
      .from("games")
      .select(
        "id,name,description,status,created_by,max_participants,invite_token,randomized_at,completed_at,archived_at,created_at,updated_at"
      )
      .order("updated_at", { ascending: false }),
    admin
      .from("game_participants")
      .select("game_id,user_id,seed_position,joined_at")
      .order("joined_at"),
    admin
      .from("tournament_matches")
      .select(
        "id,game_id,round,slot,participant_a_id,participant_b_id,winner_id,participant_a_score,participant_b_score,status,next_match_id"
      )
      .order("round")
      .order("slot"),
  ])

  for (const result of [
    profilesResult,
    rolesResult,
    pushSubscriptionsResult,
    gamesResult,
    participantsResult,
    matchesResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  return aggregateAdminConsoleData({
    authUsers,
    profiles: profilesResult.data ?? [],
    roles: rolesResult.data ?? [],
    pushSubscriptions: pushSubscriptionsResult.data ?? [],
    games: (gamesResult.data ?? []) as Parameters<
      typeof aggregateAdminConsoleData
    >[0]["games"],
    participants: participantsResult.data ?? [],
    matches: matchesResult.data ?? [],
    appOrigin: appUrl(),
  })
}
