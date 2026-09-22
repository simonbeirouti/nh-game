"use client"

import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

export function CopyInviteButton({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.add({
        title: "Invitation copied",
        description: "Share the private link with participants.",
        type: "success",
      })
    } catch {
      toast.add({
        title: "Could not copy invitation",
        description: "Copy the link from your browser and try again.",
        type: "error",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={copy}
    >
      <CopyIcon data-icon="inline-start" />
      Copy invite
    </Button>
  )
}
