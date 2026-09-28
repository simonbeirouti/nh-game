const INVITE_PATH =
  /^\/join\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export function safeNextPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard"

  try {
    const url = new URL(value, "https://colabs-games.invalid")
    if (url.origin !== "https://colabs-games.invalid") return "/dashboard"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/dashboard"
  }
}

export function safeOnboardingNextPath(
  value: string | null | undefined
): string {
  const next = safeNextPath(value)
  const pathname = new URL(next, "https://colabs-games.invalid").pathname
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return "/dashboard"
  }
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return "/dashboard"
  }
  return next
}

export function onboardingPath(next: string): string {
  return `/onboarding?next=${encodeURIComponent(safeOnboardingNextPath(next))}`
}

export function inviteTokenFromPath(path: string): string | null {
  return path.match(INVITE_PATH)?.[1] ?? null
}
