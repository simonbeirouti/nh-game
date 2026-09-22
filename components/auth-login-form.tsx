"use client"

import { useActionState } from "react"
import { MailIcon } from "lucide-react"

import { requestLoginLink } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { INITIAL_ACTION_STATE } from "@/lib/action-state"

export function AuthLoginForm({
  authError,
  next,
}: {
  authError?: string
  next: string
}) {
  const [state, action, pending] = useActionState(
    requestLoginLink,
    INITIAL_ACTION_STATE
  )
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            aria-invalid={Boolean(fieldErrors?.email)}
            required
          />
          <FieldDescription>
            We will email you a secure, one-time sign-in link.
          </FieldDescription>
          <FieldError>{fieldErrors?.email?.[0]}</FieldError>
        </Field>
        {state.message ? (
          <FieldDescription aria-live="polite">
            {state.message}
          </FieldDescription>
        ) : null}
        {authError ? (
          <FieldError>The sign-in link is invalid or has expired.</FieldError>
        ) : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <MailIcon data-icon="inline-start" />
            )}
            {pending ? "Sending…" : "Email sign-in link"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
