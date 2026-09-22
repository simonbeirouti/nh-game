"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void Promise.all([
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister())
            )
          ),
        "caches" in window
          ? caches
              .keys()
              .then((keys) =>
                Promise.all(
                  keys
                    .filter((key) => key.startsWith("nh-games-static-"))
                    .map((key) => caches.delete(key))
                )
              )
          : Promise.resolve([]),
      ])
      return
    }

    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    })
  }, [])

  return null
}
