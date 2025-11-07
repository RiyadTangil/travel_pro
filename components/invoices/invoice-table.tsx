"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Invoice } from "@/types/invoice"
import { InvoiceRow } from "./invoice-row"

interface InvoiceTableProps {
  invoices: Invoice[]
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onDownload?: (invoice: Invoice) => void
  onSend?: (invoice: Invoice) => void
}

export function InvoiceTable({
  invoices,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onSend
}: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No invoices found</div>
            <p className="text-sm">Create your first invoice to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-center font-semibold">SL.</TableHead>
                <TableHead className="font-semibold">Invoice</TableHead>
                <TableHead className="font-semibold">Sales Date</TableHead>
                <TableHead className="font-semibold">Client Name</TableHead>
                <TableHead className="text-right font-semibold">Sales Price</TableHead>
                <TableHead className="text-right font-semibold">Rec Amount</TableHead>
                <TableHead className="text-right font-semibold">Due Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">MR. No.</TableHead>
                <TableHead className="font-semibold">Passport No</TableHead>
                <TableHead className="font-semibold">Sales by</TableHead>
                <TableHead className="text-center font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice, index) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  index={index}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDownload={onDownload}
                  onSend={onSend}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}