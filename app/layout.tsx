import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"

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
