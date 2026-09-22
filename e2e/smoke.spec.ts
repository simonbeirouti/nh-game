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

  await expect(page.getByRole("heading", { name: "NH Games" })).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(
    page.getByText("Sign in or create an account with a secure email link.")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Email sign-in link" })
  ).toBeVisible()
})

test("publishes an installable manifest and offline fallback", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest")
  expect(manifest.ok()).toBeTruthy()
  await expect(manifest.json()).resolves.toMatchObject({
    name: "NH Games",
    display: "standalone",
    start_url: "/dashboard",
  })

  const offline = await request.get("/offline")
  expect(offline.ok()).toBeTruthy()
  expect(await offline.text()).toContain("You are offline")
})
