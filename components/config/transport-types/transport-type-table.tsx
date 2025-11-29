"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/loader"

export type TransportTypeRow = { id: string; name: string; active: boolean }

interface Props {
  items: TransportTypeRow[]
  onEdit: (row: TransportTypeRow) => void
  onDelete: (row: TransportTypeRow) => void
  editingId?: string | null
  deletingId?: string | null
}

export default function TransportTypeTable({ items, onEdit, onDelete, editingId, deletingId }: Props) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2 w-12">SL.</th>
            <th className="px-4 py-2">Transport Type Name</th>
            <th className="px-4 py-2 w-28">Status</th>
            <th className="px-4 py-2 w-40">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={row.id} className="border-t">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{row.name}</td>
              <td className="px-4 py-2">
                <Badge variant={row.active ? "outline" : "secondary"} className={row.active ? "text-green-700 border-green-300 bg-green-50" : "text-gray-700"}>
                  {row.active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(row)} disabled={editingId === row.id}>
                    {editingId === row.id ? <span className="flex items-center gap-2"><InlineLoader /> Edit</span> : "Edit"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(row)} disabled={deletingId === row.id}>
                    {deletingId === row.id ? <span className="flex items-center gap-2"><InlineLoader /> Delete</span> : "Delete"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

