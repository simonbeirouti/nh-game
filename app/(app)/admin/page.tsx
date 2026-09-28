import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AdminConsole } from "@/components/admin-console"
import { getAdminConsoleData } from "@/lib/admin-data"
import { getCurrentViewer } from "@/lib/auth"
import { onboardingPath } from "@/lib/auth-redirect"

export const metadata: Metadata = { title: "Admin" }

export default async function AdminPage() {
  const viewer = await getCurrentViewer()
  if (viewer && !viewer.onboardingComplete) redirect(onboardingPath("/admin"))
  if (!viewer?.isAdmin) notFound()

  const data = await getAdminConsoleData()

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-4 md:p-8 lg:px-12">
      <AdminConsole
        currentUserId={viewer.user.id}
        users={data.users}
        games={data.games}
      />
    </main>
  )
}
