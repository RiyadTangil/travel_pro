"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Eye, FileEdit, Trash2, Download, Send, MoreHorizontal } from "lucide-react"
import { Invoice } from "@/types/invoice"

interface InvoiceActionsProps {
  invoice: Invoice
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onDownload?: (invoice: Invoice) => void
  onSend?: (invoice: Invoice) => void
}

export function InvoiceActions({
  invoice,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onSend
}: InvoiceActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Quick Actions */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onView?.(invoice)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
        title="View Invoice"
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit?.(invoice)}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-200"
        title="Edit Invoice"
      >
        <FileEdit className="h-4 w-4" />
      </Button>

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-50"
            title="More Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onDownload?.(invoice)}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSend?.(invoice)}>
            <Send className="mr-2 h-4 w-4" />
            Send to Client
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete?.(invoice)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}