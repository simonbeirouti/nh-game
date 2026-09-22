import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AdminConsole } from "@/components/admin-console"
import { getAdminConsoleData } from "@/lib/admin-data"
import { getCurrentViewer } from "@/lib/auth"

export const metadata: Metadata = { title: "Admin" }

export default async function AdminPage() {
  const viewer = await getCurrentViewer()
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
