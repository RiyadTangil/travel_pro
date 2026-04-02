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
        <div className="flex flex-col gap-0.5">
          {Array.isArray(invoice.issueDates) && invoice.issueDates.length > 0 ? (
            invoice.issueDates.map((date, i) => (
              <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>
                {formatDate(date)}
              </span>
            ))
          ) : (
            <span>{formatDate(invoice.issueDate)}</span>
          )}
        </div>
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
      
      <TableCell>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-center inline-block ${
          invoice.dueAmount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
        }`}>
          {invoice.dueAmount > 0 ? formatCurrency(invoice.dueAmount) : 'PAID'}
        </div>
      </TableCell>
      
      <TableCell>
        <InvoiceStatusBadge status={invoice.status} />
      </TableCell>
      
      <TableCell className="font-medium">
        <div className="flex flex-col gap-0.5">
          {invoice.mrNo ? invoice.mrNo.split(',').map((mr, i) => (
            <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>{mr.trim()}</span>
          )) : "-"}
        </div>
      </TableCell>
      
      <TableCell>
        {invoice.passportNo}
      </TableCell>
      
      <TableCell>
        {invoice.salesBy}
      </TableCell>
      
      <TableCell>
        <InvoiceActions status={invoice.status} invoice={invoice} onView={onView} onEdit={onEdit} onDelete={onDelete} onMoneyReceipt={onMoneyReceipt} />
      </TableCell>
    </TableRow>
  )
}