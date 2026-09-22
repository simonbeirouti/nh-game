"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { createGame } from "@/app/actions/games"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ActionState } from "@/lib/action-state"

const initialState: ActionState<{ gameId: string }> = { ok: false, message: "" }

export function CreateGameForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createGame, initialState)
  const fieldErrors = state.ok ? undefined : state.fieldErrors

  useEffect(() => {
    if (state.ok && state.data?.gameId)
      router.push(`/games/${state.data.gameId}`)
  }, [router, state])

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.name)}>
          <FieldLabel htmlFor="name">Game name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Friday knockout"
            aria-invalid={Boolean(fieldErrors?.name)}
            required
          />
          <FieldError>{fieldErrors?.name?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.description)}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="What are we playing for?"
            aria-invalid={Boolean(fieldErrors?.description)}
          />
          <FieldError>{fieldErrors?.description?.[0]}</FieldError>
        </Field>
        <FieldGroup
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          <Field data-invalid={Boolean(fieldErrors?.maxParticipants)}>
            <FieldLabel htmlFor="maxParticipants">Participant limit</FieldLabel>
            <Input
              id="maxParticipants"
              name="maxParticipants"
              type="number"
              min={2}
              max={128}
              placeholder="No limit"
              aria-invalid={Boolean(fieldErrors?.maxParticipants)}
            />
            <FieldDescription>Optional, from 2 to 128 people.</FieldDescription>
            <FieldError>{fieldErrors?.maxParticipants?.[0]}</FieldError>
          </Field>
          <FieldLabel htmlFor="creatorParticipates" className="h-full">
            <Field orientation="horizontal" className="h-full">
              <FieldContent className="justify-center">
                <FieldTitle>Play in this game</FieldTitle>
                <FieldDescription>
                  Add the organizer to the bracket.
                </FieldDescription>
              </FieldContent>
              <Switch
                className="self-center"
                id="creatorParticipates"
                name="creatorParticipates"
                value="on"
                defaultChecked
              />
            </Field>
          </FieldLabel>
        </FieldGroup>
        {state.message && !state.ok ? (
          <FieldError>{state.message}</FieldError>
        ) : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {pending ? "Creating…" : "Create game"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
