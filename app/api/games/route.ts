import { getCurrentViewer } from "@/lib/auth"
import { loadGameCatalog } from "@/lib/games/server"

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
}

export async function GET() {
  if (!(await getCurrentViewer())) {
    return Response.json(
      { error: "Authentication is required" },
      { status: 401, headers: privateHeaders }
    )
  }

  return Response.json(await loadGameCatalog(), { headers: privateHeaders })
}
