import { describe, expect, it } from "vitest"

import {
  inviteTokenFromPath,
  onboardingPath,
  safeNextPath,
  safeOnboardingNextPath,
} from "./auth-redirect"

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

describe("onboarding redirects", () => {
  it("preserves an internal invite without allowing a redirect loop", () => {
    const invite = "/join/30000000-0000-4000-8000-000000000001"
    expect(onboardingPath(invite)).toBe(
      `/onboarding?next=${encodeURIComponent(invite)}`
    )
    expect(safeOnboardingNextPath("/onboarding?next=/dashboard")).toBe(
      "/dashboard"
    )
    expect(safeOnboardingNextPath("https://example.com/steal")).toBe(
      "/dashboard"
    )
  })
})
