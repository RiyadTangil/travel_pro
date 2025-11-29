"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AccountItem } from "./types"
import { InlineLoader } from "@/components/ui/loader"

interface AccountTableProps {
  items: AccountItem[]
  search: string
  onSearchChange: (v: string) => void
  onEdit: (item: AccountItem) => void
  onDelete: (item: AccountItem) => void
  loadingRowId?: string | null
}

export default function AccountTable({ items, search, onSearchChange, onEdit, onDelete, loadingRowId }: AccountTableProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q) ||
      (i.accountNo || "").toLowerCase().includes(q) ||
      (i.bankName || "").toLowerCase().includes(q) ||
      (i.branch || "").toLowerCase().includes(q)
    )
  }, [items, search])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search Here..." className="max-w-xs" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2">SL.</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Account Type</th>
              <th className="px-3 py-2">Account No</th>
              <th className="px-3 py-2">Bank Name</th>
              <th className="px-3 py-2">Routing No.</th>
              <th className="px-3 py-2">Card No</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Last Balance</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{idx + 1}</td>
                <td className="px-3 py-2">{i.name}</td>
                <td className="px-3 py-2">{i.type}</td>
                <td className="px-3 py-2">{i.accountNo || ""}</td>
                <td className="px-3 py-2">{i.bankName || ""}</td>
                <td className="px-3 py-2">{i.routingNo || ""}</td>
                <td className="px-3 py-2">{i.cardNo || ""}</td>
                <td className="px-3 py-2">{i.branch || ""}</td>
                <td className="px-3 py-2 text-green-600">{i.lastBalance.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => onEdit(i)} disabled={loadingRowId === i.id}>
                      {loadingRowId === i.id ? (<span className="flex items-center gap-1"><InlineLoader /> Edit</span>) : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline">Statement</Button>
                    <Button
                      size="sm"
                      variant={i.hasTrxn ? "secondary" : "destructive"}
                      onClick={() => onDelete(i)}
                      disabled={i.hasTrxn || loadingRowId === i.id}
                      title={i.hasTrxn ? "Cannot delete: transactions exist" : "Delete"}
                    >
                      {loadingRowId === i.id ? (<span className="flex items-center gap-1"><InlineLoader /> Delete</span>) : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={10}>No accounts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}