"use client"

import { useEffect } from "react"

import { toast } from "@/components/ui/toast"
import type { ActionState } from "@/lib/action-state"
import { feedbackToastId } from "@/lib/toast-feedback"

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

    const title = state.ok ? successTitle : errorTitle
    const type = state.ok ? "success" : "error"
    toast.add({
      id: feedbackToastId("action", title, state.message, type),
      title,
      description: state.message,
      type,
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
    toast.add({
      id: feedbackToastId("notification", title, description ?? "", type),
      title,
      description,
      type,
    })
  }, [description, title, type])

  return null
}
