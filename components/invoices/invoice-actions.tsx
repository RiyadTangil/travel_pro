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

export function InvoiceActions({ status, invoice, onView, onEdit, onDelete, onMoneyReceipt }: InvoiceActionsProps & { status: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      <Button variant="secondary" size="xs" onClick={() => onView?.(invoice)} className="h-7 px-2 text-[10px] bg-sky-500 hover:bg-sky-600 text-white">
        View
      </Button>
      <Button variant="outline" size="xs" onClick={() => onEdit?.(invoice)} className="h-7 px-2 text-[10px] bg-blue-500 hover:bg-blue-600 text-white border-none">
        Edit
      </Button>
      <Button variant="destructive" size="xs" onClick={() => onDelete?.(invoice)} className="h-7 px-2 text-[10px]">
        Delete
      </Button>
      {status !== 'paid' && (
        <Button variant="outline" size="xs" onClick={() => onMoneyReceipt?.(invoice)} className="h-7 px-2 text-[10px] bg-cyan-500 hover:bg-cyan-600 text-white border-none">
          Money Receipt
        </Button>
      )}
      <Button variant="outline" size="xs" className="h-7 px-2 text-[10px] bg-sky-400 hover:bg-sky-500 text-white border-none">
        Partial Cost
      </Button>
    </div>
  )
}