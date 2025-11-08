"use client"

import { Button } from "@/components/ui/button"
import { Eye, FileEdit, Trash2, Receipt } from "lucide-react"
import { Invoice } from "@/types/invoice"

interface InvoiceActionsProps {
  invoice: Invoice
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onMoneyReceipt?: (invoice: Invoice) => void
}

export function InvoiceActions({ invoice, onView, onEdit, onDelete, onMoneyReceipt }: InvoiceActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => onView?.(invoice)} className="h-8">
        <Eye className="h-4 w-4 mr-2" />
        View
      </Button>
      <Button variant="outline" size="sm" onClick={() => onEdit?.(invoice)} className="h-8">
        <FileEdit className="h-4 w-4 mr-2" />
        Edit
      </Button>
      <Button variant="destructive" size="sm" onClick={() => onDelete?.(invoice)} className="h-8">
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      <Button variant="outline" size="sm" onClick={() => onMoneyReceipt?.(invoice)} className="h-8">
        <Receipt className="h-4 w-4 mr-2" />
        Money Receipt
      </Button>
    </div>
  )
}