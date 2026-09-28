"use client"

import { useActionState, useState } from "react"
import { CircleCheckIcon, LogOutIcon } from "lucide-react"

import { signOut } from "@/app/actions/auth"
import { completeOnboarding } from "@/app/actions/profile"
import { ProfileImageEditor } from "@/components/profile-image-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export function OnboardingForm({
  initialName,
  avatarUrl,
  email,
  gameName,
  next,
}: {
  initialName: string
  avatarUrl: string | null
  email: string
  gameName: string | null
  next: string
}) {
  const [name, setName] = useState(initialName)
  const [avatarPending, setAvatarPending] = useState(false)
  const [state, action, pending] = useActionState(
    completeOnboarding,
    INITIAL_ACTION_STATE
  )
  const fieldError = !state.ok ? state.fieldErrors?.fullName?.[0] : undefined

  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="gap-2 text-center">
          <CardTitle className="text-2xl">Make it yours</CardTitle>
          <CardDescription>
            Choose the name people will see in games and brackets.
            {gameName ? ` We’ll take you to ${gameName} after this.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-6">
            <input type="hidden" name="next" value={next} />
            <div className="mx-auto w-36">
              <ProfileImageEditor
                userName={name}
                avatarUrl={avatarUrl}
                onPendingChange={setAvatarPending}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Photo optional. You can add or change it later.
            </p>
            <FieldGroup>
              <Field data-invalid={Boolean(fieldError)}>
                <FieldLabel htmlFor="onboarding-name">Display name</FieldLabel>
                <Input
                  id="onboarding-name"
                  name="fullName"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  minLength={2}
                  maxLength={80}
                  aria-invalid={Boolean(fieldError)}
                  required
                />
                <FieldDescription>
                  Confirm this name or change it before continuing.
                </FieldDescription>
                <FieldError>{fieldError}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldDescription className="break-all text-foreground">
                  {email}
                </FieldDescription>
              </Field>
            </FieldGroup>
            {!state.ok && state.message && !fieldError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not save your profile</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending || avatarPending}>
              {pending || avatarPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CircleCheckIcon data-icon="inline-start" />
              )}
              {pending
                ? gameName
                  ? "Saving and joining…"
                  : "Saving your profile…"
                : avatarPending
                  ? "Uploading photo…"
                  : gameName
                    ? "Save and join game"
                    : "Continue to games"}
            </Button>
          </form>
          <form action={signOut} className="mt-4">
            <Button type="submit" variant="ghost" className="w-full">
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
