"use client"

import type { ReactNode } from "react"
import { cn } from "cn"
import { UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

export function GameParticipantsDrawer({
  children,
  participantCount,
}: {
  children: ReactNode
  participantCount: number
}) {
  const isMobile = useIsMobile()
  const Panel = isMobile ? Drawer : Sheet
  const PanelTrigger = isMobile ? DrawerTrigger : SheetTrigger
  const PanelContent = isMobile ? DrawerContent : SheetContent
  const PanelHeader = isMobile ? DrawerHeader : SheetHeader
  const PanelTitle = isMobile ? DrawerTitle : SheetTitle
  const PanelDescription = isMobile ? DrawerDescription : SheetDescription

  return (
    <Panel {...(isMobile ? { showSwipeHandle: true } : {})}>
      <PanelTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            aria-label={`View ${participantCount} players`}
          />
        }
      >
        <UsersIcon data-icon="inline-start" />
        Players
      </PanelTrigger>
      <PanelContent
        className={cn(
          "flex flex-col overflow-hidden",
          isMobile ? "max-h-[92dvh]" : "h-full sm:max-w-md"
        )}
      >
        <PanelHeader>
          <PanelTitle>Players</PanelTitle>
          <PanelDescription>
            {participantCount} {participantCount === 1 ? "player" : "players"}{" "}
            in this game.
          </PanelDescription>
        </PanelHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 pb-6",
            isMobile && "pt-4"
          )}
        >
          {children}
        </div>
      </PanelContent>
    </Panel>
  )
}
