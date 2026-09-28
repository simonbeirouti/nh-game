import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { QueryProvider } from "@/components/query-provider"
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
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .limit(1)
    .maybeSingle()

  return (
    <QueryProvider userId={user.id}>
      <AppShell
        userId={user.id}
        userName={viewer.displayName}
        email={email}
        avatarUrl={viewer.avatarUrl}
        canEnableNotifications={Boolean(game)}
        isAdmin={viewer.isAdmin}
      >
        {children}
      </AppShell>
    </QueryProvider>
  )
}
