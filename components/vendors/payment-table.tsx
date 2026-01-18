"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PaymentRow {
  id: string
  sl: number
  date: string
  voucherNo: string
  paymentTo: string
  vendorInvoice: string
  account: string
  totalPayment: number
  doc: boolean
  note: string
}

interface PaymentTableProps {
  data: PaymentRow[]
  onEdit: (row: PaymentRow) => void
  onDelete: (id: string) => void
  deletingId?: string | null
}

export default function PaymentTable({ data, onEdit, onDelete, deletingId }: PaymentTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="w-[50px] font-bold text-gray-700">SL</TableHead>
            <TableHead className="font-bold text-gray-700">Date</TableHead>
            <TableHead className="font-bold text-gray-700">Voucher No</TableHead>
            <TableHead className="font-bold text-gray-700">Payment To</TableHead>
            <TableHead className="font-bold text-gray-700">Vendor/Invoice</TableHead>
            <TableHead className="font-bold text-gray-700">Account</TableHead>
            <TableHead className="text-right font-bold text-gray-700">Total Payment</TableHead>
            <TableHead className="font-bold text-gray-700">Doc</TableHead>
            <TableHead className="font-bold text-gray-700">Note</TableHead>
            <TableHead className="text-right font-bold text-gray-700">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center h-24">
                No payments found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-gray-50">
                <TableCell>{row.sl}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="font-medium">{row.voucherNo}</TableCell>
                <TableCell>
                  <span className="uppercase text-xs font-semibold text-gray-600">{row.paymentTo}</span>
                </TableCell>
                <TableCell className="text-blue-500 hover:underline cursor-pointer">{row.vendorInvoice}</TableCell>
                <TableCell>{row.account}</TableCell>
                <TableCell className="text-right font-bold">
                  {row.totalPayment.toLocaleString()}
                </TableCell>
                <TableCell>
                  {row.doc ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500">
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs"></span>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={row.note}>
                  {row.note}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                        size="sm" 
                        className="bg-green-500 hover:bg-green-600 text-white h-8 px-3"
                    >
                      View
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3"
                        onClick={() => onEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-red-500 hover:bg-red-600 text-white h-8 px-3"
                        onClick={() => onDelete(row.id)}
                        disabled={deletingId === row.id}
                    >
                      {deletingId === row.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
