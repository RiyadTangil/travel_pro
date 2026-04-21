"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ExpenseHeadModal from "@/components/expenses/ExpenseHeadModal"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Table } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"

type ExpenseHeadRow = {
  id: string
  name: string
  createdAt: string
}

export default function ExpenseHeadPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<ExpenseHeadRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<ExpenseHeadRow | null>(null)

  const client = axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await client.get(`/api/expense-heads?${params.toString()}`)
      const data = res.data
      const items: ExpenseHeadRow[] = Array.isArray(data?.items) ? data.items : []
      const pag = data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total ?? 0))
    } catch {
    } finally {
      setLoading(false)
    }
  }, [session?.user?.companyId, page, pageSize, debouncedSearch])

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
    if (session) load()
  }, [load, session])

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id)
    try {
      await client.delete(`/api/expense-heads/${id}`)
      await load()
    } catch {
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 64,
      render: (_: unknown, __: ExpenseHeadRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    { title: "Head Name", dataIndex: "name", key: "name" },
    {
      title: "Create Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString("en-GB"),
    },
    {
      title: "Action",
      key: "action",
      width: 220,
      render: (_: unknown, r: ExpenseHeadRow) => (
        <TableRowActions
          showView={false}
          onEdit={() => {
            setEditingRow(r)
            setOpenEdit(true)
          }}
          editLoading={editingId === r.id}
          editDisabled={!!editingId && editingId !== r.id}
          onDelete={() => handleDeleteRow(r.id)}
          deleteTitle="Delete expense head"
          deleteDescription={`Delete “${r.name}”? This cannot be undone.`}
          deleteLoading={deletingId === r.id}
        />
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Expense Head" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <FilterToolbar
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search heads..."
          showRefresh
          onRefresh={load}
          className="flex-1"
        >
          <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Head
          </Button>
        </FilterToolbar>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<ExpenseHeadRow>
                columns={columns}
                dataSource={rows}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps)
                  },
                  showTotal: (t) => `Total ${t} items`,
                }}
                className="border-none"
                locale={{ emptyText: loading ? "Loading..." : "No expense heads found." }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpenseHeadModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload) => {
          try {
            await client.post(`/api/expense-heads`, { name: payload.name })
            await load()
            return true
          } catch {
            return false
          }
        }}
      />

      <ExpenseHeadModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => {
          if (!v) setEditingRow(null)
          setOpenEdit(v)
        }}
        initialValues={editingRow ? { name: editingRow.name } : undefined}
        onSubmit={async (payload) => {
          if (!editingRow) return false
          try {
            setEditingId(editingRow.id)
            await client.put(`/api/expense-heads/${editingRow.id}`, { name: payload.name })
            await load()
            setEditingRow(null)
            return true
          } catch {
            return false
          } finally {
            setEditingId(null)
          }
        }}
      />
    </PageWrapper>
  )
}
