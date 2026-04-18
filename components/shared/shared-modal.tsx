"use client"

import { ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface SharedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  maxWidth?: string // e.g., "max-w-md", "max-w-5xl", "max-w-[90vw]"
  maxHeight?: string // e.g., "max-h-[80vh]", "max-h-screen"
  className?: string
}

export function SharedModal({
  open,
  onOpenChange,
  title,
  children,
  maxWidth = "max-w-5xl",
  maxHeight = "max-h-[90vh]",
  className
}: SharedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth, maxHeight, "overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
