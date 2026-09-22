import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { UpdatePasswordForm } from "@/components/password-forms"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Choose a new password" }

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth?error=expired-link")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <p className="text-sm text-balance text-muted-foreground">
          This password can be used alongside your email sign-in link.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
