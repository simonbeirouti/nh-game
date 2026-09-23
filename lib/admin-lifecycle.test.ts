import { describe, expect, it } from "vitest"

import {
  availableAdminParticipants,
  deriveRestoredGameStatus,
} from "./admin-lifecycle"

describe("availableAdminParticipants", () => {
  it("excludes users who already belong to the game", () => {
    const users = [
      { id: "creator", name: "Creator" },
      { id: "attendee", name: "Attendee" },
      { id: "admin", name: "Administrator" },
    ]

    expect(
      availableAdminParticipants(users, ["creator", "attendee"])
    ).toEqual([{ id: "admin", name: "Administrator" }])
  })
})

describe("deriveRestoredGameStatus", () => {
  it("prioritizes retained completion and draw timestamps", () => {
    expect(
      deriveRestoredGameStatus({
        completedAt: "2026-09-22T00:00:00.000Z",
        randomizedAt: "2026-09-21T00:00:00.000Z",
        maxParticipants: 8,
        participantCount: 8,
      })
    ).toBe("completed")
    expect(
      deriveRestoredGameStatus({
        completedAt: null,
        randomizedAt: "2026-09-21T00:00:00.000Z",
        maxParticipants: 8,
        participantCount: 8,
      })
    ).toBe("drafted")
  })

  it("derives full or open from capacity when no draw is retained", () => {
    expect(
      deriveRestoredGameStatus({
        completedAt: null,
        randomizedAt: null,
        maxParticipants: 4,
        participantCount: 4,
      })
    ).toBe("full")
    expect(
      deriveRestoredGameStatus({
        completedAt: null,
        randomizedAt: null,
        maxParticipants: 4,
        participantCount: 3,
      })
    ).toBe("open")
    expect(
      deriveRestoredGameStatus({
        completedAt: null,
        randomizedAt: null,
        maxParticipants: null,
        participantCount: 20,
      })
    ).toBe("open")
  })
})
