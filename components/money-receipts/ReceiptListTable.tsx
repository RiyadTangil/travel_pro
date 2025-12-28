"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { MoneyReceipt } from "./types"

type Props = {
  rows: MoneyReceipt[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  loading?: boolean
  loadingRowId?: string | null
}

export default function ReceiptListTable({ rows, onView, onEdit, onDelete, loading = false, loadingRowId = null }: Props) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SL.</TableHead>
            <TableHead>Payment Date</TableHead>
            <TableHead>Vouchor No</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Payment To</TableHead>
            <TableHead>Payment Type</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Manual Receipt No</TableHead>
            <TableHead>Paid Amount</TableHead>
            <TableHead>Doc One</TableHead>
            <TableHead>Doc Two</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{new Date(r.paymentDate).toLocaleDateString("en-GB")}</TableCell>
              <TableCell>{r.voucherNo}</TableCell>
              <TableCell>{r.clientName}</TableCell>
              <TableCell>{r.paymentTo.toUpperCase()}</TableCell>
              <TableCell>{r.paymentMethod}</TableCell>
              <TableCell>{r.accountName}</TableCell>
              <TableCell>{r.manualReceiptNo ?? ""}</TableCell>
              <TableCell>{r.paidAmount.toLocaleString()}</TableCell>
              <TableCell>{r.docOneName ? r.docOneName : ""}</TableCell>
              <TableCell>{r.docTwoName ? r.docTwoName : ""}</TableCell>
              <TableCell className="space-x-2">
                <Button variant="secondary" size="sm" onClick={() => onView(r.id)} disabled={loadingRowId === r.id}>View</Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(r.id)} disabled={loadingRowId === r.id}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)} disabled={loadingRowId === r.id}>{loadingRowId === r.id ? "Deleting..." : "Delete"}</Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center text-muted-foreground">
                {loading ? "Loading receipts..." : "No money receipts found."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
