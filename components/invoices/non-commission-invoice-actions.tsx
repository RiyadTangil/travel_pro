"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

export interface NonCommissionInvoiceActionsProps {
  invoice: any
  onView?: (invoice: any) => void
  onEdit?: (invoice: any) => void
  onDelete?: (invoice: any) => void
  onMoneyReceipt?: (invoice: any) => void
  onPartialCost?: (invoice: any) => void
  /** Narrow screens: single menu instead of multiple buttons */
  compact?: boolean
}

export function NonCommissionInvoiceActions({
  invoice,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt,
  onPartialCost,
  compact = false,
}: NonCommissionInvoiceActionsProps) {
  const hasDue = (invoice?.dueAmount ?? 0) > 0

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Invoice actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => onView?.(invoice)}>View</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit?.(invoice)}>Edit</DropdownMenuItem>
          {hasDue && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete?.(invoice)}
            >
              Delete
            </DropdownMenuItem>
          )}
          {hasDue && (
            <DropdownMenuItem onSelect={() => onMoneyReceipt?.(invoice)}>Money Receipt</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onPartialCost?.(invoice)}>Partial Cost</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Button
        variant="secondary"
        onClick={() => onView?.(invoice)}
        className="h-7 border-none bg-sky-500 px-2 text-[10px] text-white hover:bg-sky-600"
      >
        View
      </Button>
      <Button
        variant="outline"
        onClick={() => onEdit?.(invoice)}
        className="h-7 border-none bg-blue-500 px-2 text-[10px] text-white hover:bg-blue-600"
      >
        Edit
      </Button>
      {hasDue && (
        <Button variant="destructive" onClick={() => onDelete?.(invoice)} className="h-7 px-2 text-[10px]">
          Delete
        </Button>
      )}
      {hasDue && (
        <Button
          variant="outline"
          onClick={() => onMoneyReceipt?.(invoice)}
          className="h-7 border-none bg-cyan-500 px-2 text-[10px] text-white hover:bg-cyan-600"
        >
          Money Receipt
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => onPartialCost?.(invoice)}
        className="h-7 border-none bg-sky-400 px-2 text-[10px] text-white hover:bg-sky-500"
      >
        Partial Cost
      </Button>
    </div>
  )
}
