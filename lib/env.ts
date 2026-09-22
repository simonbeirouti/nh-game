import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL")
}

export function supabasePublishableKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
}

export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY")
}

export function appUrl(): string {
  const vercelUrl =
    process.env.VERCEL_ENV === "preview"
      ? (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL)
      : (process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_BRANCH_URL ||
        process.env.VERCEL_URL)

  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (vercelUrl ? `https://${vercelUrl}` : "http://127.0.0.1:3000")

  return url.replace(/\/+$/, "")
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "hello@simonbeirouti.com").toLowerCase()
}
