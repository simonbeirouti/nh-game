import Image from "next/image"

import { cn } from "@/lib/utils"

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight",
        className
      )}
    >
      <Image
        src="/icon-192.svg"
        alt=""
        width={36}
        height={36}
        className="size-9"
        aria-hidden="true"
      />
      <span>CoLabs Games</span>
    </span>
  )
}
