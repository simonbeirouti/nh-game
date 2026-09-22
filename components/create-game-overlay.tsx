"use client"

import { PlusIcon } from "lucide-react"

import { CreateGameForm } from "@/components/create-game-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

export function CreateGameOverlay() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer showSwipeHandle>
        <DrawerTrigger
          render={<Button size="icon" aria-label="Create a game" />}
        >
          <PlusIcon />
          <span className="sr-only">Create a game</span>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create a game</DrawerTitle>
            <DrawerDescription>
              Single elimination with a private invitation link and manual draw.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <CreateGameForm />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="icon" aria-label="Create a game" />}>
        <PlusIcon />
        <span className="sr-only">Create a game</span>
      </DialogTrigger>
      <DialogContent style={{ maxWidth: "36rem" }}>
        <DialogHeader>
          <DialogTitle>Create a game</DialogTitle>
          <DialogDescription>
            Single elimination with a private invitation link and manual draw.
          </DialogDescription>
        </DialogHeader>
        <CreateGameForm />
      </DialogContent>
    </Dialog>
  )
}
