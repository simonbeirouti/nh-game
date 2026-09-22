import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { UpdatePasswordForm } from "@/components/password-forms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Choose a new password" }

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth?error=expired-link")

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            This password can be used alongside your email sign-in link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </main>
  )
}
