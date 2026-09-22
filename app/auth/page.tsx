import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { TrophyIcon } from "lucide-react"

import { AuthLoginForm } from "@/components/auth-login-form"
import { getCurrentUser } from "@/lib/auth"
import { safeNextPath } from "@/lib/auth-redirect"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    mode?: "forgot" | "sign-in" | "sign-up"
    next?: string
  }>
}) {
  const { error, mode, next: requestedNext } = await searchParams
  const next = safeNextPath(requestedNext)
  const initialMode =
    mode === "forgot" || mode === "sign-up" || mode === "sign-in"
      ? mode
      : undefined
  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrophyIcon aria-hidden="true" />
            </span>
            CoLabs Games
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            <AuthLoginForm
              authError={error}
              initialMode={initialMode}
              next={next}
            />
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <Image
          src="/nh.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </main>
  )
}
