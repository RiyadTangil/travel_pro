"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { Loader2, MoreVertical } from "lucide-react"

export type TableRowActionsProps = {
  className?: string
  /** Narrow tables: single ⋯ menu instead of multiple buttons */
  compact?: boolean
  /** When false, the View button is not rendered (e.g. expense heads). Default true. */
  showView?: boolean
  onView?: () => void
  onEdit?: () => void
  /** Disables the Edit control (e.g. while another row is saving). */
  editDisabled?: boolean
  /** Shows a spinner on Edit (e.g. while PUT is in flight for this row). */
  editLoading?: boolean
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
  compact = false,
  showView = true,
  onView,
  onEdit,
  editDisabled = false,
  editLoading = false,
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

  if (compact) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Row actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {showView && onView && (
              <DropdownMenuItem onSelect={() => onView()}>View</DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem disabled={editDisabled || editLoading} onSelect={() => !editDisabled && !editLoading && onEdit()}>
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={deleteDisabled || busy}
                onSelect={() => !deleteDisabled && !busy && setConfirmOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
        {showView && onView && (
          <Button type="button" size="sm" variant="secondary" className="h-8 px-3 bg-slate-100 hover:bg-slate-200" onClick={onView}>
            View
          </Button>
        )}
        {onEdit && (
          <Button
            type="button"
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3"
            onClick={onEdit}
            disabled={editDisabled || editLoading}
          >
            {editLoading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              "Edit"
            )}
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
