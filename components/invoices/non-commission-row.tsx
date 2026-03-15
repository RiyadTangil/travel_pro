"use client"

import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, FileEdit, Trash2, Receipt, CreditCard } from "lucide-react"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { format } from "date-fns"

interface NonCommissionRowProps {
  invoice: any
  index: number
  onView?: (invoice: any) => void
  onEdit?: (invoice: any) => void
  onDelete?: (invoice: any) => void
  onMoneyReceipt?: (invoice: any) => void
  onPartialCost?: (invoice: any) => void
}

export function NonCommissionRow({
  invoice,
  index,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt,
  onPartialCost
}: NonCommissionRowProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <TableRow className="hover:bg-gray-50 text-sm">
      <TableCell className="text-center">
        {index + 1}
      </TableCell>
      
      <TableCell className="font-medium">
        {invoice.invoiceNo}
      </TableCell>
      
      <TableCell>
        {formatDate(invoice.salesDate)}
      </TableCell>

      <TableCell>
        {formatDate(invoice.issueDate)}
      </TableCell>
      
      <TableCell>
        <div className="space-y-0.5">
          <div className="font-medium text-blue-600 cursor-pointer hover:underline">
            {invoice.clientName}
          </div>
          <div className="text-xs text-blue-500">
            {invoice.clientPhone}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right">
        {formatCurrency(invoice.salesPrice)}
      </TableCell>
      
      <TableCell className="text-right">
        {formatCurrency(invoice.receivedAmount)}
      </TableCell>
      
      <TableCell className="text-right">
        <div className={`font-medium ${
          invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {invoice.dueAmount > 0 ? formatCurrency(invoice.dueAmount) : <InvoiceStatusBadge status="paid" />}
        </div>
      </TableCell>
      
      <TableCell className="font-medium text-xs whitespace-pre-line">
        {invoice.mrNo}
      </TableCell>
      
      <TableCell>
        {invoice.salesBy}
      </TableCell>
      
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5 justify-center">
          <Button variant="secondary" size="xs" onClick={() => onView?.(invoice)} className="h-7 px-2 text-[11px] bg-sky-500 hover:bg-sky-600 text-white border-none">
            View
          </Button>
          <Button variant="secondary" size="xs" onClick={() => onEdit?.(invoice)} className="h-7 px-2 text-[11px] bg-sky-400 hover:bg-sky-500 text-white border-none">
            Edit
          </Button>
          {invoice.dueAmount > 0 && (
            <Button variant="destructive" size="xs" onClick={() => onDelete?.(invoice)} className="h-7 px-2 text-[11px] bg-red-500 hover:bg-red-600 text-white border-none">
              Delete
            </Button>
          )}
          {invoice.dueAmount > 0 && (
            <Button variant="outline" size="xs" onClick={() => onMoneyReceipt?.(invoice)} className="h-7 px-2 text-[11px] bg-sky-400 hover:bg-sky-500 text-white border-none">
              Money Receipt
            </Button>
          )}
          <Button variant="outline" size="xs" onClick={() => onPartialCost?.(invoice)} className="h-7 px-2 text-[11px] bg-sky-500 hover:bg-sky-600 text-white border-none">
            Partial Cost
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
