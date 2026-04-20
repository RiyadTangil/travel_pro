"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "./confirmation-dialog"
import { Loader2, Trash2 } from "lucide-react"

interface DeleteButtonProps {
  onDelete: () => void
  isLoading?: boolean
  loadingText?: string
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
  buttonText?: string
  showIcon?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function DeleteButton({
  onDelete,
  isLoading = false,
  loadingText = "Deleting...",
  title = "Confirm Delete",
  description = "Are you sure you want to delete this record? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "destructive",
  buttonText = "Delete",
  showIcon = false,
  className = "",
  size = "sm"
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const busy = isLoading || internalLoading

  const handleConfirm = () => {
    setOpen(false)
    setInternalLoading(true)
    Promise.resolve(onDelete()).finally(() => setInternalLoading(false))
  }

  return (
    <>
      <Button
        variant={variant === "destructive" ? "destructive" : "outline"}
        size={size}
        onClick={() => setOpen(true)}
        disabled={busy}
        className={className}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            {showIcon && <Trash2 className="mr-2 h-4 w-4" />}
            {buttonText}
          </>
        )}
      </Button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={handleConfirm}
        isLoading={busy}
        loadingText={loadingText}
        variant={variant}
      />
    </>
  )
}
