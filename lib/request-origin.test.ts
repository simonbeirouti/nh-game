import { describe, expect, it } from "vitest"

import { resolveAppOrigin } from "./request-origin"

describe("resolveAppOrigin", () => {
  it("preserves the browser's localhost alias for PKCE cookies", () => {
    expect(
      resolveAppOrigin("http://127.0.0.1:3000", "http://localhost:3000"),
    ).toBe("http://localhost:3000")
  })

  it("preserves the configured production origin", () => {
    expect(
      resolveAppOrigin("https://games.example.com", "https://games.example.com"),
    ).toBe("https://games.example.com")
  })

  it("rejects an untrusted origin", () => {
    expect(
      resolveAppOrigin("https://games.example.com", "https://attacker.example"),
    ).toBe("https://games.example.com")
  })
})
