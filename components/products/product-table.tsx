"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { InlineLoader } from "@/components/ui/loader"
import type { ProductItem } from "./product-modal"

interface ProductTableProps {
  items: ProductItem[]
  onEdit: (item: ProductItem) => void
  onDelete: (item: ProductItem) => void
  searchValue: string
  onSearchChange: (v: string) => void
  currentCompanyId?: string | null
  loadingRowId?: string | null
}

export default function ProductTable({ items, onEdit, onDelete, searchValue, onSearchChange, currentCompanyId, loadingRowId }: ProductTableProps) {
  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.categoryTitle.toLowerCase().includes(q))
  }, [items, searchValue])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input value={searchValue} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search..." className="max-w-sm" />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2">SL.</th>
              <th className="px-3 py-2">Product Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Create Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const canEditDelete = currentCompanyId && item.companyId && String(item.companyId) === String(currentCompanyId)
              return (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.categoryTitle}</td>
                  <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2">
                    {item.status === 1 ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="border-grey-300 text-gray-700">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canEditDelete ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => onEdit(item)} disabled={loadingRowId === item.id}>
                          {loadingRowId === item.id ? (<span className="flex items-center gap-1"><InlineLoader /> Edit</span>) : "Edit"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(item)} disabled={loadingRowId === item.id}>
                          {loadingRowId === item.id ? (<span className="flex items-center gap-1"><InlineLoader /> Delete</span>) : "Delete"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}