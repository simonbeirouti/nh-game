"use client"

import { useFormStatus } from "react-dom"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

function JoinButton({
  label,
  gameName,
  disabled,
}: {
  label: string
  gameName: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <>
      <Button type="submit" className="w-full" disabled={disabled || pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Joining game…" : label}
        {!pending ? (
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        ) : null}
      </Button>
      {pending ? (
        <p
          role="status"
          aria-live="polite"
          className="pt-2 text-center text-sm text-muted-foreground"
        >
          Adding you to {gameName}…
        </p>
      ) : null}
    </>
  )
}

export function JoinGameForm({
  action,
  fieldName,
  fieldValue,
  gameName,
  label,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>
  fieldName: "gameId" | "inviteToken"
  fieldValue: string
  gameName: string
  label: string
  disabled?: boolean
}) {
  return (
    <form action={action} className="w-full">
      <input type="hidden" name={fieldName} value={fieldValue} />
      <JoinButton label={label} gameName={gameName} disabled={disabled} />
    </form>
  )
}
