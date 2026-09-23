import Link from "next/link"

import { BrandLogo } from "@/components/brand-logo"
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
            aria-label="CoLabs Games"
            className="rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandLogo />
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
