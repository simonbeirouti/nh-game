"use client"

import { useActionState, useState } from "react"

import {
  requestPasswordRecovery,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth"
import { ActionFeedback, ToastNotification } from "@/components/action-feedback"
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
import type { ActionState } from "@/lib/action-state"
import { INITIAL_ACTION_STATE } from "@/lib/action-state"

type AuthMode = "forgot" | "sign-in" | "sign-up"

const MODE_CONTENT: Record<AuthMode, { title: string; description: string }> = {
  "sign-in": {
    title: "Welcome back",
    description: "Enter your email and password to sign in.",
  },
  "sign-up": {
    title: "Create an account",
    description: "Use your email and a password to get started.",
  },
  forgot: {
    title: "Reset your password",
    description: "We’ll email you a secure link to choose a new password.",
  },
}

export function AuthLoginForm({
  authError,
  initialMode = "sign-in",
  next,
}: {
  authError?: string
  initialMode?: AuthMode
  next: string
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    INITIAL_ACTION_STATE
  )
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    INITIAL_ACTION_STATE
  )
  const [recoveryState, recoveryAction, recoveryPending] = useActionState(
    requestPasswordRecovery,
    INITIAL_ACTION_STATE
  )
  const content = MODE_CONTENT[mode]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <p className="text-sm text-balance text-muted-foreground">
          {content.description}
        </p>
      </div>

      {authError ? (
        <ToastNotification
          title="Could not use email link"
          description="The email link is invalid or has expired. Please try again."
          type="error"
        />
      ) : null}

      {mode === "sign-in" ? (
        <SignInForm
          action={signInAction}
          next={next}
          pending={signInPending}
          setMode={setMode}
          state={signInState}
        />
      ) : null}

      {mode === "sign-up" ? (
        <SignUpForm
          action={signUpAction}
          next={next}
          pending={signUpPending}
          state={signUpState}
        />
      ) : null}

      {mode === "forgot" ? (
        <RecoveryForm
          action={recoveryAction}
          pending={recoveryPending}
          state={recoveryState}
        />
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? "Don’t have an account?" : null}
        {mode === "sign-up" ? "Already have an account?" : null}
        {mode === "forgot" ? "Remember your password?" : null}{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Sign up" : "Sign in"}
        </Button>
      </p>
    </div>
  )
}

interface AuthFormProps {
  action: (formData: FormData) => void
  next: string
  pending: boolean
  state: ActionState
}

function SignInForm({
  action,
  next,
  pending,
  setMode,
  state,
}: AuthFormProps & { setMode: (mode: AuthMode) => void }) {
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.email)}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(fieldErrors?.email)}
            required
          />
          <FieldError>{fieldErrors?.email?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.password)}>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setMode("forgot")}
            >
              Forgot your password?
            </Button>
          </div>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            aria-invalid={Boolean(fieldErrors?.password)}
            required
          />
          <FieldError>{fieldErrors?.password?.[0]}</FieldError>
        </Field>
        <ActionFeedback state={state} errorTitle="Could not sign in" />
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

function SignUpForm({ action, next, pending, state }: AuthFormProps) {
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.email)}>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            id="sign-up-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(fieldErrors?.email)}
            required
          />
          <FieldError>{fieldErrors?.email?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.password)}>
          <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
          <Input
            id="sign-up-password"
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
          <FieldLabel htmlFor="sign-up-confirm-password">
            Confirm password
          </FieldLabel>
          <Input
            id="sign-up-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-invalid={Boolean(fieldErrors?.confirmPassword)}
            required
          />
          <FieldError>{fieldErrors?.confirmPassword?.[0]}</FieldError>
        </Field>
        <ActionFeedback
          state={state}
          successTitle="Account created"
          errorTitle="Could not create account"
        />
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

function RecoveryForm({ action, pending, state }: Omit<AuthFormProps, "next">) {
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.email)}>
          <FieldLabel htmlFor="recovery-email">Email</FieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(fieldErrors?.email)}
            required
          />
          <FieldError>{fieldErrors?.email?.[0]}</FieldError>
        </Field>
        <ActionFeedback
          state={state}
          successTitle="Reset link sent"
          errorTitle="Could not send reset link"
        />
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
