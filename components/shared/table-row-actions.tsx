"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { Loader2 } from "lucide-react"

export type TableRowActionsProps = {
  className?: string
  showView?: boolean
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void | Promise<void>
  deleteTitle?: string
  deleteDescription?: string
  deleteDisabled?: boolean
  /** Parent-controlled loading (e.g. row id match) */
  deleteLoading?: boolean
}

/**
 * View / Edit / Delete for data tables. Delete uses the same confirm + async pattern as DeleteButton (no import cycle).
 */
export function TableRowActions({
  className = "",
  showView = true,
  onView,
  onEdit,
  onDelete,
  deleteTitle = "Confirm delete",
  deleteDescription = "Are you sure you want to delete this record? This cannot be undone.",
  deleteDisabled = false,
  deleteLoading: externalLoading,
}: TableRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const busy = !!externalLoading || internalLoading

  const handleConfirmDelete = () => {
    if (!onDelete || deleteDisabled) return
    setConfirmOpen(false)
    setInternalLoading(true)
    Promise.resolve(onDelete()).finally(() => setInternalLoading(false))
  }

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
        {showView && onView && (
          <Button type="button" size="sm" variant="secondary" className="h-8 px-3 bg-slate-100 hover:bg-slate-200" onClick={onView}>
            View
          </Button>
        )}
        {onEdit && (
          <Button type="button" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3" onClick={onEdit}>
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 px-3"
            disabled={deleteDisabled || busy}
            onClick={() => !deleteDisabled && !busy && setConfirmOpen(true)}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        )}
      </div>

      {onDelete && (
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={deleteTitle}
          description={deleteDescription}
          confirmText="Delete"
          onConfirm={handleConfirmDelete}
          isLoading={busy}
          loadingText="Deleting..."
          variant="destructive"
        />
      )}
    </>
  )
}
