import "server-only"

import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"

export type InvitedGame = {
  id: string
  name: string
  description: string | null
  status: string
  max_participants: number | null
  game_participants: { count: number }[]
}

export const loadInvitedGame = cache(
  async (inviteToken: string): Promise<InvitedGame | null> => {
    const { data, error } = await createAdminClient()
      .from("games")
      .select(
        "id,name,description,status,max_participants,game_participants(count)"
      )
      .eq("invite_token", inviteToken)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as InvitedGame | null
  }
)
