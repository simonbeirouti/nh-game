import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { TrophyIcon } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
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
          <div className="w-full max-w-sm">{children}</div>
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
