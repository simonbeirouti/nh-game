import { describe, expect, it } from "vitest"

import { inviteTokenFromPath, safeNextPath } from "./auth-redirect"

describe("safeNextPath", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/join/30000000-0000-4000-8000-000000000001")).toBe(
      "/join/30000000-0000-4000-8000-000000000001"
    )
    expect(safeNextPath("/dashboard?tab=completed")).toBe(
      "/dashboard?tab=completed"
    )
  })

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://example.com/steal")).toBe("/dashboard")
    expect(safeNextPath("//example.com/steal")).toBe("/dashboard")
    expect(safeNextPath(null)).toBe("/dashboard")
  })
})

describe("inviteTokenFromPath", () => {
  it("only accepts an exact invitation path", () => {
    expect(
      inviteTokenFromPath("/join/30000000-0000-4000-8000-000000000001")
    ).toBe("30000000-0000-4000-8000-000000000001")
    expect(
      inviteTokenFromPath(
        "/join/30000000-0000-4000-8000-000000000001?unexpected=1"
      )
    ).toBeNull()
    expect(inviteTokenFromPath("/dashboard")).toBeNull()
  })
})
