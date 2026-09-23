import { describe, expect, it } from "vitest"

import { feedbackToastId } from "./toast-feedback"

describe("feedbackToastId", () => {
  it("deduplicates the same feedback across repeated effects", () => {
    const first = feedbackToastId(
      "notification",
      "Game joined",
      "You have been added to the tournament.",
      "success"
    )
    const second = feedbackToastId(
      "notification",
      "Game joined",
      "You have been added to the tournament.",
      "success"
    )

    expect(second).toBe(first)
  })

  it("keeps distinct feedback messages separate", () => {
    const joined = feedbackToastId(
      "notification",
      "Game joined",
      "You have been added to the tournament.",
      "success"
    )
    const archived = feedbackToastId(
      "notification",
      "Game archived",
      "This tournament is read-only.",
      "success"
    )

    expect(archived).not.toBe(joined)
  })
})
