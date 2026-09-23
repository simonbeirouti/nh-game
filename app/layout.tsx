import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { appUrl } from "@/lib/env"

const themeScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("theme")
      const theme = ["light", "dark", "system"].includes(storedTheme)
        ? storedTheme
        : "system"
      const resolvedTheme =
        theme === "system"
          ? matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme
      const root = document.documentElement
      root.classList.toggle("dark", resolvedTheme === "dark")
      root.style.colorScheme = resolvedTheme
    } catch {}
  })()
`

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "CoLabs Games", template: "%s · CoLabs Games" },
  description:
    "Create private games, invite your group, and run fair tournaments from start to finish.",
  applicationName: "CoLabs Games",
  category: "games",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "CoLabs Games",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    shortcut: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    siteName: "CoLabs Games",
    title: "CoLabs Games",
    description: "Friendly tournaments, without the admin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoLabs Games",
    description: "Friendly tournaments, without the admin.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
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
