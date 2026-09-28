import { getCurrentViewer } from "@/lib/auth"
import { loadGameCatalog } from "@/lib/games/server"

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
}

export async function GET() {
  const viewer = await getCurrentViewer()
  if (!viewer) {
    return Response.json(
      { error: "Authentication is required" },
      { status: 401, headers: privateHeaders }
    )
  }

  if (!viewer.onboardingComplete) {
    return Response.json(
      { error: "Complete your profile to view games" },
      { status: 403, headers: privateHeaders }
    )
  }

  return Response.json(await loadGameCatalog(), { headers: privateHeaders })
}
