"use client"

import { useEffect } from "react"

import { toast } from "@/components/ui/toast"
import type { ActionState } from "@/lib/action-state"

type ToastType = "error" | "info" | "success" | "warning"

export function ActionFeedback({
  state,
  errorTitle = "Could not complete action",
  successTitle = "Done",
}: {
  state: ActionState<unknown>
  errorTitle?: string
  successTitle?: string
}) {
  useEffect(() => {
    if (!state.message) return

    toast.add({
      title: state.ok ? successTitle : errorTitle,
      description: state.message,
      type: state.ok ? "success" : "error",
    })
  }, [errorTitle, state, successTitle])

  return null
}

export function ToastNotification({
  description,
  title,
  type = "info",
}: {
  description?: string
  title: string
  type?: ToastType
}) {
  useEffect(() => {
    toast.add({ title, description, type })
  }, [description, title, type])

  return null
}
