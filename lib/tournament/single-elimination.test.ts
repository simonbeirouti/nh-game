import { describe, expect, it } from "vitest"

import { shuffleWithSeed } from "./random"
import { SingleEliminationFormat } from "./single-elimination"

function participants(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    userId: `player-${index + 1}`,
    seed: index + 1,
  }))
}

function format() {
  let id = 0
  return new SingleEliminationFormat(() => `match-${++id}`)
}

describe("deterministic randomization", () => {
  it("reproduces the same order without duplicates", () => {
    const input = ["a", "b", "c", "d", "e", "f"]
    const first = shuffleWithSeed(input, Buffer.alloc(32, 7).toString("base64url"))
    const second = shuffleWithSeed(input, Buffer.alloc(32, 7).toString("base64url"))

    expect(first).toEqual(second)
    expect(new Set(first)).toHaveLength(input.length)
  })
})

describe("single elimination", () => {
  it.each([2, 3, 5, 8])("creates a complete bracket for %i players", (count) => {
    const state = format().initialize(participants(count))
    const bracketSize = 2 ** Math.ceil(Math.log2(count))
    expect(state.matches).toHaveLength(bracketSize - 1)
  })

  it("assigns byes to the highest seeds", () => {
    const state = format().initialize(participants(5))
    const byeWinners = state.matches
      .filter((match) => match.status === "bye")
      .map((match) => match.winnerId)

    expect(byeWinners).toEqual(
      expect.arrayContaining(["player-1", "player-2", "player-3"]),
    )
  })

  it("propagates winners and completes the final", () => {
    const strategy = format()
    let state = strategy.initialize(participants(2))
    const final = state.matches[0]
    state = strategy.recordResult(state, {
      matchId: final.id,
      winnerId: final.participantAId!,
    })

    expect(strategy.isComplete(state)).toBe(true)
    expect(strategy.getDisplayData(state).championId).toBe(final.participantAId)
  })

  it("rejects a winner who is not in the match", () => {
    const strategy = format()
    const state = strategy.initialize(participants(2))
    expect(() =>
      strategy.recordResult(state, {
        matchId: state.matches[0].id,
        winnerId: "spectator",
      }),
    ).toThrow("Winner must be a participant")
  })
})

