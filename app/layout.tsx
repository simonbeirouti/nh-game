import type { Metadata, Viewport } from "next"

import "./globals.css"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: { default: "NH Games", template: "%s · NH Games" },
  description: "Private, trustworthy coworker tournaments.",
  applicationName: "NH Games",
  appleWebApp: { capable: true, title: "NH Games", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.svg" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#252525" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster>
              {children}
              <ServiceWorkerRegistration />
            </Toaster>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
