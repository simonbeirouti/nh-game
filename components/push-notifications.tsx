"use client"

import { useEffect, useState } from "react"
import { BellIcon, BellOffIcon } from "lucide-react"

import { removePushSubscription, savePushSubscription } from "@/app/actions/push"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export function PushNotifications() {
  const [supported] = useState(
    () =>
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  )
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (supported) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then(setSubscription)
    }
  }, [supported])

  async function enable() {
    setPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") throw new Error("Notification permission was not granted.")
      const registration = await navigator.serviceWorker.ready
      const created = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const result = await savePushSubscription(created.toJSON())
      if (!result.ok) throw new Error(result.message)
      setSubscription(created)
      toast.add({ title: "Notifications enabled", description: "This device will receive tournament updates.", type: "success" })
    } catch (error) {
      toast.add({ title: "Could not enable notifications", description: error instanceof Error ? error.message : "Please try again.", type: "error" })
    } finally {
      setPending(false)
    }
  }

  async function disable() {
    if (!subscription) return
    setPending(true)
    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      const result = await removePushSubscription(endpoint)
      if (!result.ok) throw new Error(result.message)
      setSubscription(null)
      toast.add({ title: "Notifications disabled", type: "success" })
    } catch (error) {
      toast.add({ title: "Could not disable notifications", description: error instanceof Error ? error.message : "Please try again.", type: "error" })
    } finally {
      setPending(false)
    }
  }

  if (!supported) return <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>

  return subscription ? (
    <Button variant="outline" onClick={disable} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <BellOffIcon data-icon="inline-start" />}
      Disable on this device
    </Button>
  ) : (
    <Button onClick={enable} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
      Enable on this device
    </Button>
  )
}
