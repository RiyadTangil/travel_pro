"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Vendor } from "./types"

type Props = {
  vendors: Vendor[]
  onView: (v: Vendor) => void
  onEdit: (v: Vendor) => void
  onAddPayment: (v: Vendor) => void
  onDelete: (v: Vendor) => void
  onToggleStatus: (v: Vendor) => void
  loadingId?: string
  loadingAction?: "delete" | "toggleStatus"
}

export function VendorTable({ vendors, onView, onEdit, onAddPayment, onDelete, onToggleStatus, loadingId, loadingAction }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">SL</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Present Balance</TableHead>
            <TableHead>Fixed Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((v, idx) => (
            <TableRow key={v.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{v.name}</TableCell>
              <TableCell>{v.mobile}</TableCell>
              <TableCell>{v.email || ""}</TableCell>
              <TableCell>
                {v.presentBalance.type === "due" ? (
                  <span className="text-red-600">Due : {v.presentBalance.amount.toLocaleString()}</span>
                ) : (
                  <span className={v.presentBalance.type === "advance" ? "text-green-600" : "text-red-600"}>
                    {v.presentBalance.type === "advance" ? "Advance" : "Due"} : {v.presentBalance.amount.toLocaleString()}
                  </span>
                )}
              </TableCell>
              <TableCell>{v.fixedBalance}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${v.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>{v.active ? "Active" : "Inactive"}</span>
                  <Switch checked={v.active} onCheckedChange={() => onToggleStatus(v)} disabled={loadingId === v.id && loadingAction === "toggleStatus"} />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {v.presentBalance.amount === 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => onDelete(v)} disabled={loadingId === v.id && loadingAction === "delete"}>
                      {loadingId === v.id && loadingAction === "delete" ? "Deleting..." : "Delete"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onAddPayment(v)}>+ Add Payment</Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onView(v)}>View</Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(v)}>Edit</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}