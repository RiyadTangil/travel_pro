"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InlineLoader } from "@/components/ui/loader"
import Link from "next/link"

type Client = {
  id: string
  name: string
  type?: string
  phone?: string
  email?: string
  createdBy?: { id: string; name: string } | null
  presentBalance?: number
  active?: boolean
}

interface ClientsTableProps {
  clients: Client[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus?: (id: string, active: boolean) => void
  statusIds?: string[]
  editingIds?: string[]
}

export default function ClientsManagerTable({ clients, onView, onEdit, onDelete, onToggleStatus, statusIds = [], editingIds = [] }: ClientsTableProps) {
  const rows = useMemo(() => clients, [clients])

  const pad = (n: number) => String(n).padStart(4, "0")

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr className="text-left">
            <th className="px-3 py-2">SL</th>
            <th className="px-3 py-2">Unique Id</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Client Type</th>
            <th className="px-3 py-2">Mobile</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Present Balance</th>
            <th className="px-3 py-2">Created By</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.id} className={cn(i % 2 === 0 ? "bg-white" : "bg-muted/30")}>
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{(c as any).uniqueId ? String((c as any).uniqueId) : `CL-${pad(i + 1)}`}</td>
              <td className="px-3 py-2 text-sky-700 font-medium">

                <Link href={`/dashboard/reports/client-ledger?clientId=${c.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline flex items-center gap-1 group" title="View Client Ledger">
                  {c.name}
                </Link></td>
              <td className="px-3 py-2 uppercase">{(c.type || "Individual").toString()}</td>
              <td className="px-3 py-2">{c.phone || ""}</td>
              <td className="px-3 py-2">{c.email || ""}</td>
              <td className="px-3 py-2">{typeof c.presentBalance === "number" ? c.presentBalance.toLocaleString() : "0"}</td>
              <td className="px-3 py-2">{c.createdBy?.name || ""}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!c.active}
                    onCheckedChange={(val) => onToggleStatus?.(c.id, val)}
                    aria-label="Toggle active status"
                  />
                  {statusIds.includes(c.id) && <InlineLoader />}

                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => onView(c.id)} className="bg-sky-600">View</Button>
                  {editingIds.includes(c.id) ? (
                    <div className="w-[72px] flex items-center justify-center"><InlineLoader /></div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onEdit(c.id)}>Edit</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No clients found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}