"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { Loader2, MoreVertical } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

const NARROW_MAX = 768

export type TableRowActionsProps = {
  className?: string
  /** Narrow tables: single ⋯ menu instead of multiple buttons. If undefined, uses responsive check automatically. */
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
  /** Override the module prefix for permissions */
  permissionPrefix?: string
}

/**
 * View / Edit / Delete for data tables. Delete uses the same confirm + async pattern as DeleteButton (no import cycle).
 */
export function TableRowActions({
  className = "",
  compact,
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
  permissionPrefix,
}: TableRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  
  useEffect(() => {
    if (compact !== undefined) return
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [compact])

  const isCompact = compact !== undefined ? compact : isNarrow
  const busy = !!externalLoading || internalLoading

  const { canEdit, canDelete, canView } = usePermissions(permissionPrefix)

  const isEditDisabled = editDisabled || editLoading || !canEdit
  const isDeleteDisabled = deleteDisabled || busy || !canDelete
  const isViewDisabled = !canView

  const handleConfirmDelete = () => {
    if (!onDelete || deleteDisabled) return
    setConfirmOpen(false)
    setInternalLoading(true)
    Promise.resolve(onDelete()).finally(() => setInternalLoading(false))
  }

  if (isCompact) {
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
              <DropdownMenuItem disabled={isViewDisabled} onSelect={() => !isViewDisabled && onView()}>View</DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem disabled={isEditDisabled} onSelect={() => !isEditDisabled && onEdit()}>
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleteDisabled}
                onSelect={() => !isDeleteDisabled && setConfirmOpen(true)}
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
          <Button 
            type="button" 
            size="sm" 
            variant="secondary" 
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200" 
            onClick={onView}
            disabled={isViewDisabled}
          >
            View
          </Button>
        )}
        {onEdit && (
          <Button
            type="button"
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3"
            onClick={onEdit}
            disabled={isEditDisabled}
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
            disabled={isDeleteDisabled}
            onClick={() => !isDeleteDisabled && setConfirmOpen(true)}
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
