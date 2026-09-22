import { WifiOffIcon } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OfflinePage() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <WifiOffIcon aria-hidden="true" />
          <CardTitle>
            <h1>You are offline</h1>
          </CardTitle>
          <CardDescription>Reconnect to load private game data or record a result.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
