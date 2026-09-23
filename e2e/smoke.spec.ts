import { expect, test, type APIResponse } from "@playwright/test"
import sharp from "sharp"

async function expectSocialImage(response: APIResponse) {
  expect(response.ok()).toBeTruthy()
  expect(response.headers()["content-type"]).toContain("image/png")

  const metadata = await sharp(await response.body()).metadata()
  expect(metadata).toMatchObject({ width: 1200, height: 630, format: "png" })
}

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
  await expect(page.getByRole("link", { name: "CoLabs Games" })).toBeVisible()
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
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  })

  const offline = await request.get("/offline")
  expect(offline.ok()).toBeTruthy()
  expect(await offline.text()).toContain("You are offline")
})

test("publishes canonical icons and generated social cards", async ({
  page,
  request,
}) => {
  await page.goto("/")

  const iconHrefs = await page
    .locator('link[rel="icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")))
  expect(iconHrefs).toEqual(
    expect.arrayContaining([
      "/icon-192.svg",
      "/icon-512.svg",
      expect.stringMatching(/^\/favicon\.ico/),
    ])
  )
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute(
    "href",
    "/icon-192.svg"
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icon-192.svg"
  )

  const openGraphImage = page.locator('meta[property="og:image"]')
  const twitterImage = page.locator('meta[name="twitter:image"]')
  await expect(openGraphImage).toHaveAttribute("content", /opengraph-image/)
  await expect(twitterImage).toHaveAttribute("content", /twitter-image/)
  expect(await page.content()).not.toContain("social-card.png")

  const openGraphUrl = await openGraphImage.getAttribute("content")
  const twitterUrl = await twitterImage.getAttribute("content")
  expect(openGraphUrl).toBeTruthy()
  expect(twitterUrl).toBeTruthy()
  await expectSocialImage(await request.get(openGraphUrl!))
  await expectSocialImage(await request.get(twitterUrl!))
})

test("generates social metadata from a game invitation", async ({
  page,
  request,
}) => {
  const inviteToken = "30000000-0000-4000-8000-000000000001"
  await page.goto(`/join/${inviteToken}`)

  await expect(page).toHaveTitle("Join Friday Night Knockout · CoLabs Games")
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Join Friday Night Knockout"
  )
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    "A casual end-of-week tournament with room for two more players."
  )

  const openGraphUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content")
  const twitterUrl = await page
    .locator('meta[name="twitter:image"]')
    .getAttribute("content")
  expect(openGraphUrl).toContain(`/join/${inviteToken}/opengraph-image`)
  expect(twitterUrl).toContain(`/join/${inviteToken}/twitter-image`)
  await expectSocialImage(await request.get(openGraphUrl!))
  await expectSocialImage(await request.get(twitterUrl!))

  const missingInvite = await request.get(
    "/join/40000000-0000-4000-8000-000000000099"
  )
  expect(missingInvite.status()).toBe(404)
})
