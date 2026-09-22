import { CircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { GameStatus } from "@/lib/tournament/types"

const statusPresentation: Record<
  GameStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-success text-success-foreground",
  },
  full: {
    label: "Full",
    className: "bg-warning text-warning-foreground",
  },
  drafted: {
    label: "In progress",
    className: "bg-info text-info-foreground",
  },
  completed: {
    label: "Completed",
    className: "bg-primary text-primary-foreground",
  },
  archived: {
    label: "Archived",
    className: "bg-destructive/10 text-destructive",
  },
}

export function GameStatusBadge({ status }: { status: GameStatus }) {
  const presentation = statusPresentation[status]

  return (
    <Badge className={presentation.className}>
      <CircleIcon data-icon="inline-start" fill="currentColor" />
      {presentation.label}
    </Badge>
  )
}
