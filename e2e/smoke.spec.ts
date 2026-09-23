import { expect, test } from "@playwright/test"

test("renders the public landing page and sends guests to sign in", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      name: "Friendly tournaments, without the admin.",
    })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Latest games" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true })
  ).toHaveAttribute("href", "/auth")
  await expect(
    page.getByRole("button", { name: "Sign in or create an account" })
  ).toHaveAttribute("href", "/auth")
})

test("renders the shared sign-in and account creation page", async ({
  page,
}) => {
  await page.goto("/auth")

  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "CoLabs Games" })
  ).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible()
  await expect(page.getByLabel("Password")).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible()

  await page.getByRole("button", { name: "Forgot your password?" }).click()
  await expect(
    page.getByRole("heading", { name: "Reset your password" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Send reset link" })
  ).toBeVisible()

  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("button", { name: "Sign up" }).click()
  await expect(
    page.getByRole("heading", { name: "Create an account" })
  ).toBeVisible()
  await expect(page.getByLabel("Confirm password")).toBeVisible()
})

test("renders not-found routes without React script warnings", async ({
  page,
}) => {
  const scriptWarnings: string[] = []
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Encountered a script tag while rendering")
    ) {
      scriptWarnings.push(message.text())
    }
  })

  await page.goto("/route-that-does-not-exist")

  await expect(
    page.getByRole("heading", { name: "This page could not be found." })
  ).toBeVisible()
  expect(scriptWarnings).toEqual([])
})

test("publishes an installable manifest and offline fallback", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest")
  expect(manifest.ok()).toBeTruthy()
  await expect(manifest.json()).resolves.toMatchObject({
    name: "CoLabs Games",
    short_name: "CoLabs Games",
    display: "standalone",
    start_url: "/dashboard",
  })

  const offline = await request.get("/offline")
  expect(offline.ok()).toBeTruthy()
  expect(await offline.text()).toContain("You are offline")
})
