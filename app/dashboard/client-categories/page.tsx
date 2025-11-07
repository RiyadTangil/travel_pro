"use client"

import { useEffect, useMemo, useState } from "react"
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
import ClientCategoryTable, { ClientCategoryItem } from "@/components/clients/client-category-table"
import { ClientCategoryModal } from "@/components/clients/client-category-modal"

export default function ClientCategoriesPage() {
  const [items, setItems] = useState<ClientCategoryItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClientCategoryItem | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/client-categories?page=${page}&pageSize=${pageSize}`)
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

  const handleAdd = async (name: string, prefix: string) => {
    setLoading(true)
    await fetch(`/api/clients/client-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, prefix }),
    })
    setIsModalOpen(false)
    await fetchData()
  }

  const handleEdit = (item: ClientCategoryItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header (same as dashboard) */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow   py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Client Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Table card */}
        <Card className="mx-auto max-w-6xl">
          <CardHeader className="grid grid-cols-2 items-center">
            <CardTitle className="text-base">Client Category</CardTitle>
            <div className="flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingItem(null); setIsModalOpen(true) }}>+ Add Category</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ClientCategoryTable
              items={items}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onEdit={handleEdit}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      <ClientCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (name, prefix) => {
          setLoading(true)
          try {
            if (editingItem) {
              await fetch(`/api/clients/client-categories/${editingItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, prefix }),
              })
            } else {
              await fetch(`/api/clients/client-categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, prefix }),
              })
            }
          } finally {
            setIsModalOpen(false)
            await fetchData()
          }
        }}
        initialName={editingItem?.name}
        initialPrefix={editingItem?.prefix}
        title={editingItem ? "Edit Client Category" : "Add Client Category"}
        submitLabel={editingItem ? "Save" : "Submit"}
        loading={loading}
      />
    </div>
  )
}