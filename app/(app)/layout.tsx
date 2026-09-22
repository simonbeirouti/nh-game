import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { getCurrentViewer } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const viewer = await getCurrentViewer()
  const email = viewer?.user.email
  if (!viewer || !email) redirect("/auth")
  const user = viewer.user

  const supabase = await createClient()
  const [{ data: profile }, { data: game }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("games").select("id").limit(1).maybeSingle(),
  ])

  return (
    <AppShell
      userName={profile?.full_name ?? email.split("@")[0]}
      email={email}
      avatarUrl={profile?.avatar_url ?? null}
      canEnableNotifications={Boolean(game)}
    >
      {children}
    </AppShell>
  )
}
