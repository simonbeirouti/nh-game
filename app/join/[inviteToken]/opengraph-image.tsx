import { notFound } from "next/navigation"

import { loadInvitedGame } from "@/lib/games/invite"
import {
  createSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/social-card"

export const alt = "CoLabs Games tournament invitation"
export const size = socialImageSize
export const contentType = socialImageContentType
export const revalidate = 300

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ inviteToken: string }>
}) {
  const { inviteToken } = await params
  const game = await loadInvitedGame(inviteToken)
  if (!game) notFound()

  return createSocialCard({
    eyebrow: "You’re invited",
    title: game.name,
    description:
      game.description || "Join this private tournament on CoLabs Games.",
  })
}
