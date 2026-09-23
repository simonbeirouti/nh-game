import { z } from "zod"

import { getCurrentViewer } from "@/lib/auth"
import { loadGameDetail } from "@/lib/games/server"

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ gameId: string }> }
) {
  if (!(await getCurrentViewer())) {
    return Response.json(
      { error: "Authentication is required" },
      { status: 401, headers: privateHeaders }
    )
  }

  const parsed = z.uuid().safeParse((await context.params).gameId)
  if (!parsed.success) {
    return Response.json(
      { error: "Game not found" },
      { status: 404, headers: privateHeaders }
    )
  }

  const game = await loadGameDetail(parsed.data)
  if (!game) {
    return Response.json(
      { error: "Game not found" },
      { status: 404, headers: privateHeaders }
    )
  }

  return Response.json(game, { headers: privateHeaders })
}
