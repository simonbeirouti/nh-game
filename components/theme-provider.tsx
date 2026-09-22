"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = Exclude<Theme, "system">

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "theme"
const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function storedTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system"
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = theme === "system" ? systemTheme() : theme
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
  return resolved
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside ThemeProvider")
  return context
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(storedTheme)
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>(systemTheme)

  const setTheme = React.useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    setThemeState(nextTheme)
    setResolvedTheme(applyTheme(nextTheme))
  }, [])

  React.useEffect(() => {
    applyTheme(theme)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemTheme = () => {
      if (theme === "system") setResolvedTheme(applyTheme("system"))
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const nextTheme = event.newValue
      if (
        nextTheme === "light" ||
        nextTheme === "dark" ||
        nextTheme === "system"
      ) {
        setThemeState(nextTheme)
        setResolvedTheme(applyTheme(nextTheme))
      }
    }

    mediaQuery.addEventListener("change", handleSystemTheme)
    window.addEventListener("storage", handleStorage)
    return () => {
      mediaQuery.removeEventListener("change", handleSystemTheme)
      window.removeEventListener("storage", handleStorage)
    }
  }, [theme])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (event.key !== "d" && event.key !== "D") ||
        isTypingTarget(event.target)
      ) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
