"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { BellIcon, LogOutIcon, SaveIcon, UserRoundIcon } from "lucide-react"

import { signOut } from "@/app/actions/auth"
import { updateProfile } from "@/app/actions/profile"
import { ActionFeedback } from "@/components/action-feedback"
import { ProfileImageEditor } from "@/components/profile-image-editor"
import { PushNotifications } from "@/components/push-notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ActionState } from "@/lib/action-state"
import { clearPersistedQueryState } from "@/lib/query-persistence"

const initialState: ActionState = { ok: false, message: "" }

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function ProfileSheet({
  userId,
  userName,
  email,
  avatarUrl,
  canEnableNotifications,
}: {
  userId: string
  userName: string
  email: string
  avatarUrl: string | null
  canEnableNotifications: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const [fullName, setFullName] = useState(userName)
  const [state, action, pending] = useActionState(updateProfile, initialState)

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [router, state.ok])

  const Panel = isMobile ? Drawer : Sheet
  const PanelTrigger = isMobile ? DrawerTrigger : SheetTrigger
  const PanelContent = isMobile ? DrawerContent : SheetContent
  const PanelHeader = isMobile ? DrawerHeader : SheetHeader
  const PanelTitle = isMobile ? DrawerTitle : SheetTitle
  const PanelDescription = isMobile ? DrawerDescription : SheetDescription
  const PanelFooter = isMobile ? DrawerFooter : SheetFooter

  async function signOutAndClearCache() {
    queryClient.clear()
    await clearPersistedQueryState(userId)
    navigator.serviceWorker?.controller?.postMessage({
      type: "CLEAR_PRIVATE_STATE",
    })
    await signOut()
  }

  return (
    <Panel {...(isMobile ? { showSwipeHandle: true } : {})}>
      <PanelTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open profile and notifications"
          />
        }
      >
        <Avatar>
          <AvatarImage src={avatarUrl ?? undefined} alt="" />
          <AvatarFallback>
            {initials(userName) || <UserRoundIcon aria-hidden="true" />}
          </AvatarFallback>
        </Avatar>
      </PanelTrigger>
      <PanelContent
        className={cn(
          "flex flex-col overflow-hidden",
          isMobile ? "max-h-[92dvh]" : "h-full sm:max-w-md"
        )}
      >
        <PanelHeader>
          <PanelTitle>Profile</PanelTitle>
          <PanelDescription>
            Manage how you appear in games and your device notifications.
          </PanelDescription>
        </PanelHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="flex flex-col gap-6 px-4">
            <form action={action}>
              <FieldGroup>
                <ProfileImageEditor userName={userName} avatarUrl={avatarUrl} />
                <Field
                  data-invalid={Boolean(
                    !state.ok && state.fieldErrors?.fullName
                  )}
                >
                  <FieldLabel htmlFor="fullName">Name</FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.currentTarget.value)}
                    aria-invalid={Boolean(
                      !state.ok && state.fieldErrors?.fullName
                    )}
                    required
                  />
                  <FieldError>
                    {!state.ok ? state.fieldErrors?.fullName?.[0] : undefined}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldDescription className="break-all text-foreground">
                    {email}
                  </FieldDescription>
                </Field>
                <ActionFeedback
                  state={state}
                  successTitle="Profile updated"
                  errorTitle="Could not update profile"
                />
                <Field>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SaveIcon data-icon="inline-start" />
                    )}
                    {pending ? "Saving…" : "Save profile"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>

            <Separator />

            <section
              className="flex flex-col gap-3"
              aria-labelledby="notifications-title"
            >
              <div>
                <h2
                  id="notifications-title"
                  className="flex items-center gap-2 font-medium"
                >
                  <BellIcon aria-hidden="true" />
                  Notifications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Receive draw, bracket, result, and invitation updates on this
                  device.
                </p>
              </div>
              {canEnableNotifications ? (
                <PushNotifications />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create or join a game to enable notifications.
                </p>
              )}
            </section>
          </div>
        </div>
        <PanelFooter className={cn(isMobile && "border-t pt-4")}>
          <form action={signOutAndClearCache}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </PanelFooter>
      </PanelContent>
    </Panel>
  )
}
