import Link from "next/link"
import { TrophyIcon } from "lucide-react"

import { ProfileSheet } from "@/components/profile-sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function AppShell({
  children,
  userId,
  userName,
  email,
  avatarUrl,
  canEnableNotifications,
  isAdmin,
}: {
  children: React.ReactNode
  userId: string
  userName: string
  email: string
  avatarUrl: string | null
  canEnableNotifications: boolean
  isAdmin: boolean
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-8 lg:px-12">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-medium"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrophyIcon aria-hidden="true" />
            </span>
            <span>CoLabs Games</span>
          </Link>
          <div className="flex items-center gap-1">
            {isAdmin ? (
              <Button
                variant="ghost"
                render={<Link href="/admin" />}
                nativeButton={false}
              >
                Admin
              </Button>
            ) : null}
            <ThemeToggle />
            <ProfileSheet
              userId={userId}
              userName={userName}
              email={email}
              avatarUrl={avatarUrl}
              canEnableNotifications={canEnableNotifications}
            />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
