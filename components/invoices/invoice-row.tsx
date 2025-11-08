"use client"

import { TableCell, TableRow } from "@/components/ui/table"
import { Invoice } from "@/types/invoice"
import { InvoiceActions } from "./invoice-actions"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { format } from "date-fns"

interface InvoiceRowProps {
  invoice: Invoice
  index: number
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onMoneyReceipt?: (invoice: Invoice) => void
}

export function InvoiceRow({
  invoice,
  index,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt
}: InvoiceRowProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('BDT', '৳')
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-medium text-center">
        {index + 1}
      </TableCell>
      
      <TableCell className="font-medium">
        {invoice.invoiceNo}
      </TableCell>
      
      <TableCell>
        {formatDate(invoice.salesDate)}
      </TableCell>
      
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {invoice.clientName}
          </div>
          <div className="text-sm text-blue-600">
            {invoice.clientPhone}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right font-medium">
        {formatCurrency(invoice.salesPrice)}
      </TableCell>
      
      <TableCell className="text-right">
        {formatCurrency(invoice.receivedAmount)}
      </TableCell>
      
      <TableCell className="text-right">
        <div className={`font-medium ${
          invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {formatCurrency(invoice.dueAmount)}
        </div>
      </TableCell>
      
      <TableCell>
        <InvoiceStatusBadge status={invoice.status} />
      </TableCell>
      
      <TableCell className="font-medium">
        {invoice.mrNo}
      </TableCell>
      
      <TableCell>
        {invoice.passportNo}
      </TableCell>
      
      <TableCell>
        {invoice.salesBy}
      </TableCell>
      
      <TableCell>
        <InvoiceActions invoice={invoice} onView={onView} onEdit={onEdit} onDelete={onDelete} onMoneyReceipt={onMoneyReceipt} />
      </TableCell>
    </TableRow>
  )
}