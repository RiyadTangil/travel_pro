"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CategoryTable, { CategoryItem } from "@/components/categories/category-table"
import { CategoryModal } from "@/components/categories/category-modal"

export default function CategoryPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<CategoryItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?page=${page}&pageSize=${pageSize}`, {
        headers: {
          "x-company-id": session?.user?.companyId ?? "",
        },
      })
      const data = await res.json()
      setItems(data.data || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize])

  const handleAdd = async (name: string) => {
    setLoading(true)
    await fetch(`/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, companyId: session?.user?.companyId ?? null }),
    })
    setIsModalOpen(false)
    await fetchData()
  }

  const handleEdit = (item: CategoryItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (item: CategoryItem) => {
    if (!confirm(`Delete category "${item.name}"?`)) return
    setLoading(true)
    try {
      await fetch(`/api/categories/${item.id}`, { method: "DELETE" })
    } finally {
      await fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow   py-6">
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Category</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="mx-auto max-w-6xl">
          <CardHeader className="grid grid-cols-2 items-center">
            <CardTitle className="text-base">Category</CardTitle>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingItem(null); setIsModalOpen(true) }}>+ Add Category</Button>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryTable
              items={items}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (name, companyId) => {
          setLoading(true)
          try {
            if (editingItem) {
              await fetch(`/api/categories/${editingItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              })
            } else {
              await fetch(`/api/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, companyId }),
              })
            }
          } finally {
            setIsModalOpen(false)
            await fetchData()
          }
        }}
        initialName={editingItem?.name}
        title={editingItem ? "Edit Category" : "Add Category"}
        submitLabel={editingItem ? "Save" : "Submit"}
        loading={loading}
      />
    </div>
  )
}