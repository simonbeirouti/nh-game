import { describe, expect, it } from "vitest"

import { updatePasswordSchema } from "./password-validation"

describe("updatePasswordSchema", () => {
  it("requires at least eight characters", () => {
    const result = updatePasswordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        "Password must be at least 8 characters."
      )
    }
  })

  it("requires matching confirmation", () => {
    const result = updatePasswordSchema.safeParse({
      password: "new-password",
      confirmPassword: "different-password",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match."
      )
    }
  })

  it("accepts a matching password", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "new-password",
      }).success
    ).toBe(true)
  })
})
