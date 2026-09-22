import "server-only"

import webpush from "web-push"

import { appUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

export interface PushMessage {
  title: string
  body: string
  url: string
}

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@simonbeirouti.com",
    publicKey,
    privateKey,
  )
  return true
}

export async function sendPushToUsers(
  userIds: readonly string[],
  message: PushMessage,
) {
  if (!configureWebPush() || userIds.length === 0) return

  const admin = createAdminClient()
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .in("user_id", [...new Set(userIds)])

  if (!subscriptions?.length) return

  const payload = JSON.stringify({
    ...message,
    url: new URL(message.url, appUrl()).toString(),
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
  })

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        )
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : null
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id)
        }
      }
    }),
  )
}

