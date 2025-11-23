"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import ProductTable from "@/components/products/product-table"
import ProductModal, { ProductItem } from "@/components/products/product-modal"
import { useSession } from "next-auth/react"
import { InlineLoader } from "@/components/ui/loader"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function ProductsPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<ProductItem[]>([])
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductItem | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ProductItem | null>(null)

  const companyId = useMemo(() => session?.user?.companyId ?? null, [session?.user?.companyId])

  const load = async () => {
    setLoadingList(true)
    try {
      const res = await fetch(`/api/products?page=1&pageSize=100&q=${encodeURIComponent(search)}`)
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
    } catch (e) {
      setItems([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search])

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
      await load()
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
      await load()
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Product</h1>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => { setEditing(null); setOpen(true) }}>
          {loadingList ? (<span className="flex items-center gap-2"><InlineLoader /> Loading...</span>) : "+ Add New Product"}
        </Button>
      </div>

      <ProductTable
        items={items}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchValue={search}
        onSearchChange={setSearch}
        currentCompanyId={companyId}
        loadingRowId={loadingRowId}
      />

      <ProductModal
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
        onSubmit={onAddEditSubmit}
        initialItem={editing}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteItem} onOpenChange={(v) => !v && setConfirmDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete {confirmDeleteItem?.name}? This action can be undone later since we keep a soft delete.</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {loadingRowId === confirmDeleteItem?.id ? (<span className="flex items-center gap-2"><InlineLoader /> Deleting...</span>) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}