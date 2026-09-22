import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { appUrl } from "./env"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("appUrl", () => {
  it("prefers an explicitly configured canonical URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://games.example.com/")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "nhpp.vercel.app")

    expect(appUrl()).toBe("https://games.example.com")
  })

  it("uses the Vercel production domain when no canonical URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "nhpp.vercel.app")
    vi.stubEnv("VERCEL_URL", "nhpp-deployment.vercel.app")

    expect(appUrl()).toBe("https://nhpp.vercel.app")
  })

  it("uses the assigned Vercel URL for preview deployments", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_BRANCH_URL", "nhpp-feature.vercel.app")
    vi.stubEnv("VERCEL_URL", "nhpp-deployment.vercel.app")

    expect(appUrl()).toBe("https://nhpp-feature.vercel.app")
  })

  it("falls back to the local development URL outside Vercel", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "")
    vi.stubEnv("VERCEL_BRANCH_URL", "")
    vi.stubEnv("VERCEL_URL", "")

    expect(appUrl()).toBe("http://127.0.0.1:3000")
  })
})
