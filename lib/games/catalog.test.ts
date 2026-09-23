import { describe, expect, it } from "vitest"

import {
  mergeVisibleGameCatalog,
  toGameCatalogItem,
  type GameCatalogRow,
} from "./catalog"

function row(
  id: string,
  creator: string,
  createdAt: string,
  count = 0
): GameCatalogRow {
  return {
    id,
    name: `Game ${id}`,
    description: null,
    status: "open",
    created_by: creator,
    max_participants: 16,
    created_at: createdAt,
    game_participants: [{ count }],
  }
}

describe("game catalog merging", () => {
  it("deduplicates public rows while preserving owner and member access", () => {
    const owner = row("owner", "viewer", "2026-09-20T00:00:00.000Z", 2)
    const member = row("member", "someone", "2026-09-21T00:00:00.000Z", 4)
    const joinable = row("joinable", "someone", "2026-09-22T00:00:00.000Z", 6)

    const catalog = mergeVisibleGameCatalog(
      [owner, member],
      [owner, member, joinable],
      "viewer"
    )

    expect(catalog.map(({ id, access }) => [id, access])).toEqual([
      ["joinable", "joinable"],
      ["member", "member"],
      ["owner", "owner"],
    ])
  })

  it("normalizes counts and explicit admin access", () => {
    const item = toGameCatalogItem(
      row("admin-game", "someone", "2026-09-22T00:00:00.000Z", 7),
      "admin"
    )

    expect(item).toMatchObject({
      id: "admin-game",
      access: "admin",
      participantCount: 7,
      maxParticipants: 16,
    })
  })
})
