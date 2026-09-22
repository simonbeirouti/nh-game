import type { Metadata } from "next"

import "./globals.css"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: { default: "CoLabs Games", template: "%s · CoLabs Games" },
  description: "Private, trustworthy coworker tournaments.",
  applicationName: "CoLabs Games",
  appleWebApp: {
    capable: true,
    title: "CoLabs Games",
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-touch-icon.svg" },
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
            {children}
            <ServiceWorkerRegistration />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
