export const AVATAR_BUCKET = "avatars"
export const MAX_AVATAR_SIZE = 10 * 1024 * 1024
export const ACCEPTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

export function avatarExtension(contentType: string) {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  if (contentType === "image/avif") return "avif"
  return "jpg"
}

export function avatarObjectPath(avatarUrl: string | null, userId: string) {
  if (!avatarUrl) return null

  try {
    const pathname = new URL(avatarUrl).pathname
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
    const markerIndex = pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length))
    return path.startsWith(`${userId}/`) ? path : null
  } catch {
    return null
  }
}
