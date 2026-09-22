"use client"

import { useActionState } from "react"
import { KeyRoundIcon } from "lucide-react"

import { updatePassword } from "@/app/actions/auth"
import { ActionFeedback } from "@/components/action-feedback"
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

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePassword,
    INITIAL_ACTION_STATE
  )
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.password)}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-invalid={Boolean(fieldErrors?.password)}
            required
          />
          <FieldDescription>Use at least eight characters.</FieldDescription>
          <FieldError>{fieldErrors?.password?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.confirmPassword)}>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-invalid={Boolean(fieldErrors?.confirmPassword)}
            required
          />
          <FieldError>{fieldErrors?.confirmPassword?.[0]}</FieldError>
        </Field>
        <ActionFeedback state={state} errorTitle="Could not update password" />
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <KeyRoundIcon data-icon="inline-start" />
            )}
            {pending ? "Updating…" : "Update password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
