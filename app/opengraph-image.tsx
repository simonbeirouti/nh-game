import {
  createSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/social-card"

export const alt = "CoLabs Games"
export const size = socialImageSize
export const contentType = socialImageContentType

export default function OpenGraphImage() {
  return createSocialCard({
    eyebrow: "Private tournaments",
    title: "Friendly tournaments, without the admin.",
    description:
      "Create a private game, invite your group, and run a fair bracket from start to finish.",
  })
}
