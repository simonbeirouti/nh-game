import type { APIRequestContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

const runAuthFlow = process.env.RUN_AUTH_E2E === "1"

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

async function newestMagicLink(
  request: APIRequestContext,
  existingIds: Set<string>,
  email: string
): Promise<string | null> {
  const listResponse = await request.get(
    "http://127.0.0.1:7004/api/v1/messages"
  )
  if (!listResponse.ok()) return null
  const list = (await listResponse.json()) as { messages: MailpitMessage[] }
  const message = list.messages.find(
    (candidate) =>
      !existingIds.has(candidate.ID) &&
      candidate.To.some(({ Address }) => Address === email)
  )
  if (!message) return null

  const detailResponse = await request.get(
    `http://127.0.0.1:7004/api/v1/message/${message.ID}`
  )
  if (!detailResponse.ok()) return null
  const detail = (await detailResponse.json()) as { HTML: string }
  return (
    detail.HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&") ?? null
  )
}

async function mailIds(request: APIRequestContext): Promise<Set<string>> {
  const response = await request.get("http://127.0.0.1:7004/api/v1/messages")
  const data = (await response.json()) as { messages: MailpitMessage[] }
  return new Set(data.messages.map(({ ID }) => ID))
}

async function waitForMagicLink(
  request: APIRequestContext,
  existingIds: Set<string>,
  email: string
): Promise<string> {
  let link: string | null = null
  await expect
    .poll(async () => {
      link = await newestMagicLink(request, existingIds, email)
      return link
    })
    .not.toBeNull()
  return link!
}

async function signInByEmail(
  page: Page,
  request: APIRequestContext,
  email: string,
  expectedNext: string
) {
  const existingIds = await mailIds(request)
  await page.getByLabel("Email").fill(email)
  await page.getByRole("button", { name: "Email sign-in link" }).click()
  await expect(
    page.getByText("Check your email for the secure sign-in link.")
  ).toBeVisible()

  const link = await waitForMagicLink(request, existingIds, email)
  const authUrl = new URL(link)
  expect(authUrl.pathname).toBe("/auth/confirm")
  expect(authUrl.searchParams.get("next")).toBe(expectedNext)
  expect(authUrl.searchParams.get("token_hash")).toBeTruthy()
  await page.goto(link)
}

async function signOut(page: Page) {
  await page.getByLabel("Open profile and notifications").click()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/$/)
}

test("central login, invitations, and database roles work together", async ({
  browser,
  context,
  page,
  request,
}) => {
  test.setTimeout(150_000)
  test.skip(
    !runAuthFlow,
    "Set RUN_AUTH_E2E=1 with the local Supabase stack running"
  )

  const suffix = Date.now()
  const ownerEmail = `owner-${suffix}@example.com`
  const invitedEmail = `invited-${suffix}@example.com`
  const adminAddress =
    process.env.ADMIN_EMAIL?.toLowerCase() ?? "hello@simonbeirouti.com"
  const gameName = `E2E central auth ${suffix}`

  // Unknown email: central login creates the account and rejects open redirects.
  await page.goto("/auth?next=https%3A%2F%2Fexample.com%2Fsteal")
  await signInByEmail(page, request, ownerEmail, "/dashboard")
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Create a game" })
  ).toBeVisible()
  await page.getByLabel("Open profile and notifications").click()
  await expect(page.getByLabel("Email")).toHaveValue(ownerEmail)
  await page.getByRole("button", { name: "Close" }).click()

  // Existing users use the same page and return to the dashboard.
  await signOut(page)
  await page.goto("/auth")
  await signInByEmail(page, request, ownerEmail, "/dashboard")
  await expect(page).toHaveURL(/\/dashboard$/)

  // Regular users can create and manage their own games.
  await page.getByRole("button", { name: "Create a game" }).click()
  const createDialog = page.getByRole("dialog", { name: "Create a game" })
  await createDialog.getByLabel("Game name").fill(gameName)
  await createDialog.getByRole("button", { name: "Create game" }).click()
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+$/)
  await expect(page.getByRole("button", { name: "Actions" })).toBeVisible()

  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.getByRole("button", { name: "Copy invite" }).click()
  const inviteUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(inviteUrl).toMatch(/\/join\/[0-9a-f-]+$/)
  const invitePath = new URL(inviteUrl).pathname

  const invitedContext = await browser.newContext()
  const invitedPage = await invitedContext.newPage()

  // Expired invite login links return to the invitation and can be retried.
  await invitedPage.goto(
    `/auth/confirm?next=${encodeURIComponent(invitePath)}&token_hash=invalid&type=email`
  )
  await expect(invitedPage).toHaveURL(/\/join\/[0-9a-f-]+\?error=/)
  await expect(
    invitedPage.getByText(
      "The sign-in link is invalid or has expired. Please try again."
    )
  ).toBeVisible()

  // New invited user: invite -> central login -> automatic join.
  await invitedPage.goto(inviteUrl)
  await invitedPage.getByRole("button", { name: "Sign in to join" }).click()
  await expect(invitedPage).toHaveURL(/\/auth\?next=/)
  await signInByEmail(invitedPage, request, invitedEmail, invitePath)
  await expect(invitedPage).toHaveURL(/\/games\/[0-9a-f-]+\?joined=1$/)
  await expect(invitedPage.getByText(/ \(you\)$/)).toBeVisible()
  await expect(
    invitedPage.getByRole("button", { name: "Actions" })
  ).toHaveCount(0)

  // Existing signed-out invited user follows the same resumable flow.
  await signOut(invitedPage)
  await invitedPage.goto(inviteUrl)
  await invitedPage.getByRole("button", { name: "Sign in to join" }).click()
  await signInByEmail(invitedPage, request, invitedEmail, invitePath)
  await expect(invitedPage).toHaveURL(/\/games\/[0-9a-f-]+\?joined=1$/)

  // Existing signed-in user can join directly without another login.
  await invitedPage.goto(inviteUrl)
  await invitedPage
    .getByRole("button", { name: `Join as ${invitedEmail}` })
    .click()
  await expect(invitedPage).toHaveURL(/\/games\/[0-9a-f-]+$/)
  await invitedContext.close()

  // ADMIN_EMAIL bootstraps the first database role and can manage every game.
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto("/auth")
  await signInByEmail(adminPage, request, adminAddress, "/dashboard")
  await expect(adminPage).toHaveURL(/\/dashboard$/)
  await adminPage.getByRole("link", { name: new RegExp(gameName) }).click()
  await expect(adminPage.getByRole("button", { name: "Actions" })).toBeVisible()
  await adminPage.getByRole("button", { name: "Actions" }).click()
  await adminPage.getByRole("menuitem", { name: "Delete game" }).click()
  await adminPage.getByRole("button", { name: "Delete game" }).click()
  await expect(adminPage).toHaveURL(/\/dashboard$/)
  await adminContext.close()
})
