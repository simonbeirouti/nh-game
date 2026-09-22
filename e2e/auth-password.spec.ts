import type { APIRequestContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

const runAuthFlow = process.env.RUN_AUTH_E2E === "1"

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

async function newestEmailLink(
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

async function waitForEmailLink(
  request: APIRequestContext,
  existingIds: Set<string>,
  email: string
): Promise<string> {
  let link: string | null = null
  await expect
    .poll(async () => {
      link = await newestEmailLink(request, existingIds, email)
      return link
    })
    .not.toBeNull()
  return link!
}

async function signUpWithPassword(page: Page, email: string, password: string) {
  await page.getByRole("button", { name: "Sign up" }).click()
  await page.getByRole("textbox", { name: "Email" }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
}

async function signInWithPassword(page: Page, email: string, password: string) {
  await page.getByRole("textbox", { name: "Email" }).fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
}

async function resetPassword(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string
) {
  const existingIds = await mailIds(request)
  await page.getByRole("button", { name: "Forgot your password?" }).click()
  await page.getByRole("textbox", { name: "Email" }).fill(email)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(
    page.getByText(
      "If that account exists, a password reset link has been sent."
    )
  ).toBeVisible()

  const link = await waitForEmailLink(request, existingIds, email)
  await page.goto(link)
  await expect(page).toHaveURL(/\/auth\/update-password$/)
  await page.getByLabel("New password").fill(password)
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Update password" }).click()
  await expect(page).toHaveURL(/\/dashboard\?password=updated$/)
}

async function signOut(page: Page) {
  await page.getByLabel("Open profile and notifications").click()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/$/)
}

test("password auth, invitations, and database roles work together", async ({
  browser,
  context,
  page,
  request,
}) => {
  test.setTimeout(300_000)
  test.skip(
    !runAuthFlow,
    "Set RUN_AUTH_E2E=1 with the local Supabase stack running"
  )

  const suffix = Date.now()
  const ownerEmail = `owner-${suffix}@example.com`
  const invitedEmail = `invited-${suffix}@example.com`
  const invitedName = `invited ${suffix}`
  const adminAddress =
    process.env.ADMIN_EMAIL?.toLowerCase() ?? "hello@simonbeirouti.com"
  const gameName = `E2E central auth ${suffix}`
  const ownerPassword = "owner-password-123"
  const invitedPassword = "invited-password-123"
  const adminPassword = "admin-password-123"

  // New account creation rejects open redirects.
  await page.goto("/auth?next=https%3A%2F%2Fexample.com%2Fsteal")
  await signUpWithPassword(page, ownerEmail, ownerPassword)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Create a game" })
  ).toBeVisible()
  await page.getByLabel("Open profile and notifications").click()
  await expect(page.getByRole("dialog").getByLabel("Email")).toHaveValue(
    ownerEmail
  )
  await page.getByRole("button", { name: "Close" }).click()

  // Existing users use the same page and return to the dashboard.
  await signOut(page)
  await page.goto("/auth")
  await signInWithPassword(page, ownerEmail, ownerPassword)
  await expect(page).toHaveURL(/\/dashboard$/)

  // Recovery changes the password from the same auth page.
  await signOut(page)
  await page.goto("/auth")
  await resetPassword(page, request, ownerEmail, "owner-password-456")

  await signOut(page)
  await page.goto("/auth")
  await signInWithPassword(page, ownerEmail, "owner-password-456")
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("button", { name: "Admin" })).toHaveCount(0)
  const deniedAdminResponse = await page.goto("/admin")
  expect(deniedAdminResponse?.status()).toBe(404)
  await page.goto("/dashboard")

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

  // Expired email links return to the invitation and can be retried.
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
  await signUpWithPassword(invitedPage, invitedEmail, invitedPassword)
  await expect(invitedPage).toHaveURL(new RegExp(`${invitePath}$`))
  await invitedPage
    .getByRole("button", { name: `Join as ${invitedEmail}` })
    .click()
  await expect(invitedPage).toHaveURL(/\/games\/[0-9a-f-]+$/)
  await expect(invitedPage.getByText(/ \(you\)$/)).toBeVisible()
  await expect(
    invitedPage.getByRole("button", { name: "Actions" })
  ).toHaveCount(0)

  // Existing signed-out invited user follows the same resumable flow.
  await signOut(invitedPage)
  await invitedPage.goto(inviteUrl)
  await invitedPage.getByRole("button", { name: "Sign in to join" }).click()
  await signInWithPassword(invitedPage, invitedEmail, invitedPassword)
  await expect(invitedPage).toHaveURL(new RegExp(`${invitePath}$`))
  await invitedPage
    .getByRole("button", { name: `Join as ${invitedEmail}` })
    .click()
  await expect(invitedPage).toHaveURL(/\/games\/[0-9a-f-]+$/)

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
  await resetPassword(adminPage, request, adminAddress, adminPassword)
  await expect(adminPage).toHaveURL(/\/dashboard$/)
  await expect(adminPage.getByRole("button", { name: "Admin" })).toBeVisible()
  await adminPage.getByRole("button", { name: "Admin" }).click()
  await expect(adminPage).toHaveURL(/\/admin$/)
  await expect(adminPage.getByRole("tab", { name: /Users/ })).toBeVisible()
  await expect(adminPage.getByRole("tab", { name: /Games/ })).toBeVisible()

  const userRow = adminPage.getByLabel("View Simon Beirouti")
  await userRow.focus()
  await userRow.press("Enter")
  await expect(
    adminPage.getByRole("dialog").getByText("hello@simonbeirouti.com")
  ).toBeVisible()
  await adminPage.getByRole("button", { name: "Close" }).click()

  await adminPage.getByRole("tab", { name: /Games/ }).click()
  await adminPage.getByLabel(`View ${gameName}`).press("Space")
  let gameSheet = adminPage.getByRole("dialog", { name: gameName })
  await expect(gameSheet).toBeVisible()

  const editedGameName = `${gameName} managed`
  await gameSheet.getByLabel("Name").fill(editedGameName)
  await gameSheet
    .getByLabel("Description")
    .fill("Managed from the admin console")
  await gameSheet.getByRole("button", { name: "Save changes" }).click()
  await expect(adminPage.getByText("Game details updated.")).toBeVisible()
  gameSheet = adminPage.getByRole("dialog", { name: editedGameName })

  const userCombobox = gameSheet.getByRole("combobox")
  await userCombobox.fill("Ava Nguyen")
  await adminPage.getByRole("option", { name: /Ava Nguyen/ }).click()
  await gameSheet.getByRole("button", { name: "Add participant" }).click()
  await expect(adminPage.getByText("Participant added.")).toBeVisible()
  await gameSheet
    .getByRole("row", { name: /Ava Nguyen/ })
    .getByRole("button", { name: "Remove" })
    .click()
  await expect(adminPage.getByText("Participant removed.")).toBeVisible()
  await adminPage.getByRole("button", { name: "Close" }).click()

  // Soft deletion removes access but preserves the participant reference.
  await adminPage.getByRole("tab", { name: /Users/ }).click()
  await adminPage
    .getByRole("textbox", { name: "Search users" })
    .fill(invitedEmail)
  await adminPage.getByLabel(`View ${invitedName}`).press("Enter")
  const invitedUserSheet = adminPage.getByRole("dialog", { name: invitedName })
  await invitedUserSheet.getByRole("button", { name: "Delete user" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete user" })
    .click()
  await expect(
    adminPage.getByText("Account access removed; game history was preserved.")
  ).toBeVisible()
  await expect(adminPage.getByLabel(`View ${invitedName}`)).toHaveCount(0)

  await adminPage.getByRole("tab", { name: /Games/ }).click()
  await adminPage
    .getByRole("textbox", { name: "Search games" })
    .fill(editedGameName)
  await adminPage.getByLabel(`View ${editedGameName}`).press("Enter")
  gameSheet = adminPage.getByRole("dialog", { name: editedGameName })
  await expect(gameSheet.getByText(`${invitedName} (deleted)`)).toBeVisible()

  await gameSheet.getByRole("button", { name: "Start draw" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Start draw" })
    .click()
  await expect(adminPage.getByText("Draw created.")).toBeVisible()

  await gameSheet.getByRole("button", { name: / won$/ }).first().click()
  await expect(adminPage.getByText("Result recorded.")).toBeVisible()
  await gameSheet.getByRole("button", { name: /^Change to / }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Correct result" })
    .click()
  await expect(
    adminPage.getByText("Result corrected; dependent results were cleared.")
  ).toBeVisible()

  await gameSheet.getByRole("button", { name: "Reset draw" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset draw" })
    .click()
  await expect(adminPage.getByText("Draw and results reset.")).toBeVisible()

  await gameSheet.getByRole("button", { name: "Archive" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Archive" })
    .click()
  await expect(adminPage.getByText("Game archived.")).toBeVisible()
  await gameSheet.getByRole("button", { name: "Unarchive" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Unarchive" })
    .click()
  await expect(adminPage.getByText("Game restored.")).toBeVisible()

  await gameSheet.getByRole("button", { name: "Delete game" }).click()
  await adminPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete game" })
    .click()
  await expect(adminPage.getByText("Game permanently deleted.")).toBeVisible()
  await expect(gameSheet).toHaveCount(0)
  await adminContext.close()
})
