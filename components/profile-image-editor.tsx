"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon, Trash2Icon, UserRoundIcon } from "lucide-react"

import { removeProfileAvatar, updateProfileAvatar } from "@/app/actions/profile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function ProfileImageEditor({
  userName,
  avatarUrl,
  onPendingChange,
}: {
  userName: string
  avatarUrl: string | null
  onPendingChange?: (pending: boolean) => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    onPendingChange?.(pending)
  }, [onPendingChange, pending])

  function chooseImage() {
    inputRef.current?.click()
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    startTransition(async () => {
      let upload = file

      const isHeicCandidate =
        /image\/(heic|heif)/i.test(file.type) ||
        /\.(heic|heif)$/i.test(file.name)

      if (isHeicCandidate) {
        try {
          const { heicTo, isHeic } = await import("heic-to")
          if (!(await isHeic(file))) throw new Error("Invalid HEIC image")

          const jpeg = await heicTo({
            blob: file,
            type: "image/jpeg",
            quality: 0.86,
          })
          upload = new File(
            [jpeg],
            file.name.replace(/\.(heic|heif)$/i, "") + ".jpg",
            { type: "image/jpeg" }
          )
        } catch {
          toast.add({
            title: "Could not read that image",
            description:
              "Try another photo or export it as JPEG, PNG, or WebP.",
            type: "error",
          })
          return
        }
      }

      const formData = new FormData()
      formData.set("avatar", upload)
      const result = await updateProfileAvatar(formData)
      if (result.ok) {
        setCurrentAvatarUrl(result.data?.avatarUrl ?? null)
        router.refresh()
        toast.add({
          title: "Profile image updated",
          description: result.message ?? "Your new image has been saved.",
          type: "success",
        })
        return
      }

      toast.add({
        title: "Could not update profile image",
        description: result.message,
        type: "error",
      })
    })
  }

  function removeImage() {
    startTransition(async () => {
      const result = await removeProfileAvatar()
      if (result.ok) {
        setCurrentAvatarUrl(null)
        router.refresh()
        toast.add({
          title: "Profile image removed",
          description: result.message,
          type: "success",
        })
        return
      }

      toast.add({
        title: "Could not remove profile image",
        description: result.message,
        type: "error",
      })
    })
  }

  const avatar = (
    <Avatar
      className={`size-full rounded-xl after:rounded-xl ${currentAvatarUrl ? "" : "after:border-0"}`}
      style={{ width: "100%", height: "100%" }}
    >
      <AvatarImage
        src={currentAvatarUrl ?? undefined}
        alt={currentAvatarUrl ? `${userName}'s profile` : ""}
        className="rounded-xl"
      />
      <AvatarFallback
        className={`rounded-xl text-3xl ${currentAvatarUrl ? "" : "bg-transparent"}`}
      >
        {pending ? (
          <Spinner />
        ) : (
          initials(userName) || <UserRoundIcon aria-hidden="true" />
        )}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <Field>
      <FieldLabel className="sr-only">Profile image</FieldLabel>
      {currentAvatarUrl ? (
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: "1 / 1" }}
        >
          {avatar}
          <div className="absolute right-3 bottom-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={pending}
              aria-label="Replace profile image"
              onClick={chooseImage}
            >
              {pending ? <Spinner /> : <PencilIcon />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={pending}
                    aria-label="Remove profile image"
                  />
                }
              >
                <Trash2Icon />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove profile image?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your initials will be shown until you add another image.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={removeImage}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="aspect-square h-auto w-full border-dashed bg-transparent p-0 hover:bg-muted/40"
          style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }}
          disabled={pending}
          aria-label="Choose a profile image"
          onClick={chooseImage}
        >
          {avatar}
        </Button>
      )}
      <Input
        ref={inputRef}
        id="avatar"
        name="avatar"
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        disabled={pending}
        onChange={handleImageChange}
      />
    </Field>
  )
}
