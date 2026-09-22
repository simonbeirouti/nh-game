"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import * as React from "react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isHydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const renderedTheme = isHydrated ? resolvedTheme : "light"
  const nextTheme = renderedTheme === "dark" ? "light" : "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
    >
      {renderedTheme === "dark" ? (
        <SunIcon aria-hidden="true" />
      ) : (
        <MoonIcon aria-hidden="true" />
      )}
    </Button>
  )
}
