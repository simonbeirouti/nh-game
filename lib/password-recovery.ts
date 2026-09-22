import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export async function sendPasswordRecoveryEmail(
  email: string,
  origin: string
): Promise<void> {
  const redirectTo = new URL("/auth/confirm", origin)
  redirectTo.searchParams.set("next", "/auth/update-password")
  const admin = createAdminClient()
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  })
  if (error) throw error
}
