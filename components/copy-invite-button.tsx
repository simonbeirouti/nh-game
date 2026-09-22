"use client"

import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

export function CopyInviteButton({ url }: { url: string }) {
  async function copy() {
    await navigator.clipboard.writeText(url)
    toast.add({ title: "Invitation copied", description: "Share the private link with participants.", type: "success" })
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      <CopyIcon data-icon="inline-start" />
      Copy invite
    </Button>
  )
}

