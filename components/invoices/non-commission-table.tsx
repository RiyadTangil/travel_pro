"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { NonCommissionRow } from "./non-commission-row"

interface NonCommissionTableProps {
  invoices: any[]
  onView?: (invoice: any) => void
  onEdit?: (invoice: any) => void
  onDelete?: (invoice: any) => void
  onMoneyReceipt?: (invoice: any) => void
  onPartialCost?: (invoice: any) => void
}

export function NonCommissionTable({
  invoices,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt,
  onPartialCost
}: NonCommissionTableProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No invoices found</div>
            <p className="text-sm">Create your first non-commission invoice to get started</p>
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
              <TableRow className="bg-gray-100/50">
                <TableHead className="text-center font-bold text-gray-900 w-[50px]">SL.</TableHead>
                <TableHead className="font-bold text-gray-900">Invoice</TableHead>
                <TableHead className="font-bold text-gray-900">Sales Date</TableHead>
                <TableHead className="font-bold text-gray-900">Issue Date</TableHead>
                <TableHead className="font-bold text-gray-900">Client Name</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Sales Price</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Rec Amount</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Due Amount</TableHead>
                <TableHead className="font-bold text-gray-900">MR. No.</TableHead>
                <TableHead className="font-bold text-gray-900">Sales by</TableHead>
                <TableHead className="text-center font-bold text-gray-900">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice, index) => (
                <NonCommissionRow
                  key={invoice.id}
                  invoice={invoice}
                  index={index}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMoneyReceipt={onMoneyReceipt}
                  onPartialCost={onPartialCost}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
