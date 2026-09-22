import { describe, expect, it } from "vitest"

import {
  aggregateAdminConsoleData,
  type AdminAggregationInput,
} from "./admin-aggregation"

const ACTIVE_USER_ID = "10000000-0000-4000-8000-000000000001"
const OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
const DELETED_USER_ID = "10000000-0000-4000-8000-000000000003"

function fixture(): AdminAggregationInput {
  return {
    authUsers: [
      {
        id: ACTIVE_USER_ID,
        email: "active@example.test",
        created_at: "2026-01-01T00:00:00.000Z",
        last_sign_in_at: "2026-02-01T00:00:00.000Z",
      },
      {
        id: OTHER_USER_ID,
        email: "other@example.test",
        created_at: "2026-01-02T00:00:00.000Z",
        last_sign_in_at: undefined,
      },
    ],
    profiles: [
      {
        id: ACTIVE_USER_ID,
        full_name: "Active Player",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: OTHER_USER_ID,
        full_name: "Other Player",
        avatar_url: null,
        created_at: "2026-01-02T00:00:00.000Z",
      },
      {
        id: DELETED_USER_ID,
        full_name: "Former Player",
        avatar_url: null,
        created_at: "2026-01-03T00:00:00.000Z",
      },
    ],
    roles: [{ user_id: ACTIVE_USER_ID, role: "admin" }],
    pushSubscriptions: [
      { user_id: ACTIVE_USER_ID },
      { user_id: ACTIVE_USER_ID },
    ],
    games: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        name: "Open Cup",
        description: null,
        status: "open",
        created_by: ACTIVE_USER_ID,
        max_participants: null,
        invite_token: "30000000-0000-4000-8000-000000000001",
        randomized_at: null,
        completed_at: null,
        archived_at: null,
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        name: "Completed Cup",
        description: null,
        status: "completed",
        created_by: ACTIVE_USER_ID,
        max_participants: 2,
        invite_token: "30000000-0000-4000-8000-000000000002",
        randomized_at: "2026-03-02T00:00:00.000Z",
        completed_at: "2026-03-03T00:00:00.000Z",
        archived_at: null,
        created_at: "2026-03-02T00:00:00.000Z",
        updated_at: "2026-03-03T00:00:00.000Z",
      },
      {
        id: "20000000-0000-4000-8000-000000000003",
        name: "Historical Cup",
        description: null,
        status: "archived",
        created_by: DELETED_USER_ID,
        max_participants: 2,
        invite_token: "30000000-0000-4000-8000-000000000003",
        randomized_at: "2026-03-04T00:00:00.000Z",
        completed_at: "2026-03-05T00:00:00.000Z",
        archived_at: "2026-03-06T00:00:00.000Z",
        created_at: "2026-03-04T00:00:00.000Z",
        updated_at: "2026-03-06T00:00:00.000Z",
      },
    ],
    participants: [
      {
        game_id: "20000000-0000-4000-8000-000000000001",
        user_id: ACTIVE_USER_ID,
        seed_position: null,
        joined_at: "2026-03-01T00:00:00.000Z",
      },
      {
        game_id: "20000000-0000-4000-8000-000000000001",
        user_id: DELETED_USER_ID,
        seed_position: null,
        joined_at: "2026-03-01T01:00:00.000Z",
      },
      {
        game_id: "20000000-0000-4000-8000-000000000002",
        user_id: ACTIVE_USER_ID,
        seed_position: 1,
        joined_at: "2026-03-02T00:00:00.000Z",
      },
      {
        game_id: "20000000-0000-4000-8000-000000000003",
        user_id: ACTIVE_USER_ID,
        seed_position: 2,
        joined_at: "2026-03-04T00:00:00.000Z",
      },
    ],
    matches: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        game_id: "20000000-0000-4000-8000-000000000002",
        round: 1,
        slot: 1,
        participant_a_id: ACTIVE_USER_ID,
        participant_b_id: DELETED_USER_ID,
        winner_id: ACTIVE_USER_ID,
        status: "complete",
        next_match_id: null,
      },
    ],
    appOrigin: "https://games.example.test",
  }
}

describe("aggregateAdminConsoleData", () => {
  it("groups active and completed games for each active account", () => {
    const data = aggregateAdminConsoleData(fixture())
    const active = data.users.find((user) => user.id === ACTIVE_USER_ID)

    expect(active?.role).toBe("admin")
    expect(active?.notificationDeviceCount).toBe(2)
    expect(active?.activeGames.map((game) => game.name)).toEqual(["Open Cup"])
    expect(active?.completedGames.map((game) => game.name)).toEqual([
      "Completed Cup",
      "Historical Cup",
    ])
    expect(data.users.some((user) => user.id === DELETED_USER_ID)).toBe(false)
  })

  it("preserves deleted accounts as inactive historical references", () => {
    const data = aggregateAdminConsoleData(fixture())
    const openGame = data.games.find((game) => game.name === "Open Cup")
    const historicalGame = data.games.find(
      (game) => game.name === "Historical Cup"
    )
    const deletedParticipant = openGame?.participants.find(
      (participant) => participant.id === DELETED_USER_ID
    )

    expect(deletedParticipant).toMatchObject({
      fullName: "Former Player",
      email: null,
      isActive: false,
    })
    expect(historicalGame).toMatchObject({
      organizerName: "Former Player",
      organizerActive: false,
    })
  })

  it("derives invite URLs and final-match champions", () => {
    const data = aggregateAdminConsoleData(fixture())
    const completed = data.games.find((game) => game.name === "Completed Cup")

    expect(completed?.inviteUrl).toBe(
      "https://games.example.test/join/30000000-0000-4000-8000-000000000002"
    )
    expect(completed?.championId).toBe(ACTIVE_USER_ID)
  })
})
