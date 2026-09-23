import "server-only"

import { createClient } from "@supabase/supabase-js"

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env"

export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
