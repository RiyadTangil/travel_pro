"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InlineLoader } from "@/components/ui/loader"
import Link from "next/link"
import { StatusSwitch } from "@/components/shared/status-switch"
import { Loader2 } from "lucide-react"

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
  rows: Client[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus?: (id: string, active: boolean) => void
  statusIds?: string[]
  editingIds?: string[]
  loading?: boolean
}

export default function ClientsManagerTable({ 
  rows, 
  onView, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  statusIds = [], 
  editingIds = [], 
  loading 
}: ClientsTableProps) {
  const pad = (n: number) => String(n).padStart(4, "0")

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Loading clients...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">SL</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Unique Id</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Name</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Client Type</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Mobile</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Email</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Present Balance</th>
            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px]">Created By</th>
            <th className="px-4 py-3 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px]">Status</th>
            <th className="px-4 py-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((c, i) => (
            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-4 py-3 text-slate-600 font-medium">{i + 1}</td>
              <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{(c as any).uniqueId ? String((c as any).uniqueId) : `CL-${pad(i + 1)}`}</td>
              <td className="px-4 py-3">
                <Link href={`/dashboard/reports/client-ledger?clientId=${c.id}`} className="font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1" title="View Client Ledger">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  c.type === "Corporate" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                )}>
                  {(c.type || "Individual").toString()}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 font-medium">{c.phone || "—"}</td>
              <td className="px-4 py-3 text-slate-500">{c.email || "—"}</td>
              <td className="px-4 py-3 font-bold text-slate-700">
                <span className={cn(
                  (c.presentBalance || 0) < 0 ? "text-red-600" : "text-green-600"
                )}>
                  {typeof c.presentBalance === "number" ? c.presentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 text-[12px]">{c.createdBy?.name || ""}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-center gap-1">
                  <StatusSwitch
                    checked={!!c.active}
                    onCheckedChange={(val) => onToggleStatus?.(c.id, val)}
                    disabled={statusIds.includes(c.id)}
                  />
                  {statusIds.includes(c.id) && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2  transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => onView(c.id)} className="h-8 px-3 border-sky-200 hover:bg-sky-50 text-sky-700">View</Button>
                  {editingIds.includes(c.id) ? (
                    <Button size="sm" variant="secondary" disabled className="h-8 px-3"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Edit</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onEdit(c.id)} className="h-8 px-3">Edit</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)} className="h-8 px-3 bg-red-500 hover:bg-red-600">Delete</Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-20 text-center">
                <div className="flex flex-col items-center">
                  <p className="text-slate-400 font-medium italic">No clients found matching your criteria</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}