import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Reset password" }

export default function ForgotPasswordPage() {
  redirect("/auth?mode=forgot")
}
