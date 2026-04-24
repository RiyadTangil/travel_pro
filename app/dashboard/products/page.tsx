"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ProductTable from "@/components/products/product-table"
import ProductModal, { ProductItem } from "@/components/products/product-modal"
import { useSession } from "next-auth/react"
import { InlineLoader } from "@/components/ui/loader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"

export default function ProductsPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<ProductItem[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductItem | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ProductItem | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const companyId = useMemo(() => session?.user?.companyId ?? null, [session?.user?.companyId])

  const load = useCallback(
    async (overridePage?: number, overridePageSize?: number) => {
      const p = overridePage ?? page
      const ps = overridePageSize ?? pageSize
      setLoadingList(true)
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(ps),
          q: debouncedSearch,
        })
        if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
        if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))

        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        const mapped: ProductItem[] = (data.data || []).map((d: any) => ({
          id: d.id,
          name: d.product_name,
          status: d.product_status,
          categoryId: d.product_category_id,
          categoryTitle: d.category_title,
          companyId: d.company_id,
          createdAt: d.createdAt,
        }))
        setItems(mapped)
        setTotal(Number(data.total ?? 0))
      } catch {
        setItems([])
        setTotal(0)
      } finally {
        setLoadingList(false)
      }
    },
    [page, pageSize, debouncedSearch, dateRange]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim()
      setDebouncedSearch((prev) => {
        if (next !== prev) setPage(1)
        return next
      })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const onAddEditSubmit = async (payload: { name: string; categoryId: string; companyId: string | null }) => {
    if (editing) {
      setLoadingRowId(editing.id)
      const res = await fetch(`/api/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, categoryId: payload.categoryId }),
      })
      if (res.status === 409) {
        const j = await res.json()
        setLoadingRowId(null)
        throw new Error(j.error || "Duplicate product name")
      }
      setLoadingRowId(null)
      setOpen(false)
      setEditing(null)
      setPage(1)
      await load(1, pageSize)
    } else {
      const res = await fetch(`/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, categoryId: payload.categoryId, companyId: payload.companyId }),
      })
      if (res.status === 409) {
        const j = await res.json()
        throw new Error(j.error || "Duplicate product name")
      }
      setOpen(false)
      setPage(1)
      await load(1, pageSize)
    }
  }

  const handleEdit = (item: ProductItem) => {
    setEditing(item)
    setOpen(true)
  }

  const handleDelete = (item: ProductItem) => {
    setConfirmDeleteItem(item)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteItem) return
    setLoadingRowId(confirmDeleteItem.id)
    try {
      await fetch(`/api/products/${confirmDeleteItem.id}`, { method: "DELETE" })
      await load()
    } finally {
      setLoadingRowId(null)
      setConfirmDeleteItem(null)
    }
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Products" }]}>
      <div className="space-y-4 px-4">
        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={(r) => {
            setDateRange(r)
            setPage(1)
          }}
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search product name..."
          showRefresh
          onRefresh={() => void load()}
          className="flex-1 min-w-0"
        >
          <Button
            className="bg-sky-500 hover:bg-sky-600 text-white shrink-0"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Product
          </Button>

        </FilterToolbar>

        <ProductTable
          items={items}
          loading={loadingList}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p, ps) => {
            setPage(p)
            setPageSize(ps)
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentCompanyId={companyId}
          loadingRowId={loadingRowId}
        />

        <ProductModal
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) setEditing(null)
          }}
          onSubmit={onAddEditSubmit}
          initialItem={editing}
        />

        <AlertDialog open={!!confirmDeleteItem} onOpenChange={(v) => !v && setConfirmDeleteItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete {confirmDeleteItem?.name}? This action can be undone later since we keep
              a soft delete.
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteItem(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                {loadingRowId === confirmDeleteItem?.id ? (
                  <span className="flex items-center gap-2">
                    <InlineLoader /> Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  )
}
