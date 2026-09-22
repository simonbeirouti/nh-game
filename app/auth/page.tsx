import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { TrophyIcon } from "lucide-react"

import { AuthLoginForm } from "@/components/auth-login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { safeNextPath } from "@/lib/auth-redirect"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next: requestedNext } = await searchParams
  const next = safeNextPath(requestedNext)
  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrophyIcon aria-hidden="true" />
          </div>
          <CardTitle>
            <h1>NH Games</h1>
          </CardTitle>
          <CardDescription>
            Sign in or create an account with a secure email link. No password
            is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthLoginForm authError={error} next={next} />
        </CardContent>
      </Card>
    </main>
  )
}
