"use client"

import { PencilLine } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Button } from "../ui/button"
import { Pagination } from "../ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

export interface ClientCategoryItem {
  id: string
  name: string
  prefix: string
}

interface ClientCategoryTableProps {
  items: ClientCategoryItem[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onEdit: (item: ClientCategoryItem) => void
  loading?: boolean
}

export default function ClientCategoryTable({ items, page, pageSize, total, onPageChange, onPageSizeChange, onEdit, loading }: ClientCategoryTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-16">SL</TableHead>
              <TableHead>Client Category Name</TableHead>
              <TableHead>Client Category Prefix</TableHead>
              <TableHead className="text-right w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id} className={loading ? "opacity-60" : undefined}>
                <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.prefix}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} disabled={loading} aria-label="Edit">
                    <PencilLine className="h-4 w-4 text-blue-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No client categories</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(parseInt(v))}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Pagination className="justify-end">
          {/* Minimal page controls */}
          <div className="flex items-center gap-2">
            <button className="text-sm px-2 py-1 rounded hover:bg-muted" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
            <span className="text-sm">Page {page} / {totalPages}</span>
            <button className="text-sm px-2 py-1 rounded hover:bg-muted" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
          </div>
        </Pagination>
      </div>
    </div>
  )
}