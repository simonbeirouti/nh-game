import { describe, expect, it } from "vitest"

import { avatarExtension, avatarObjectPath } from "./avatar-storage"

const userId = "10000000-0000-4000-8000-000000000001"

describe("avatar storage", () => {
  it("extracts an owned avatar path from a public URL", () => {
    expect(
      avatarObjectPath(
        `http://127.0.0.1:7001/storage/v1/object/public/avatars/${userId}/profile%20photo.webp`,
        userId
      )
    ).toBe(`${userId}/profile photo.webp`)
  })

  it("refuses paths outside the current user's folder", () => {
    expect(
      avatarObjectPath(
        "http://127.0.0.1:7001/storage/v1/object/public/avatars/another-user/photo.jpg",
        userId
      )
    ).toBeNull()
  })

  it("maps supported image types to stable extensions", () => {
    expect(avatarExtension("image/png")).toBe("png")
    expect(avatarExtension("image/webp")).toBe("webp")
    expect(avatarExtension("image/avif")).toBe("avif")
    expect(avatarExtension("image/jpeg")).toBe("jpg")
  })
})
