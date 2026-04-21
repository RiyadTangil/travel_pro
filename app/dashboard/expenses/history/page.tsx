"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ExpenseModal from "@/components/expenses/ExpenseModal"
import { DateRange } from "react-day-picker"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Table } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"

type ExpenseRow = {
  id: string
  date: string
  voucherNo: string
  accountName: string
  totalAmount: number
  items: Array<{ headId: string; headName: string; amount: number }>
  paymentMethod: string
  accountId: string
  note?: string
}

export default function ExpenseHistoryPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<ExpenseRow | null>(null)

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
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))

      const res = await client.get(`/api/expenses?${params.toString()}`)
      const data = res.data
      const items: ExpenseRow[] = Array.isArray(data?.items) ? data.items : []
      const pag = data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total ?? 0))
    } catch {
    } finally {
      setLoading(false)
    }
  }, [session?.user?.companyId, page, pageSize, debouncedSearch, dateRange])

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
      await client.delete(`/api/expenses/${id}`)
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
      render: (_: unknown, __: ExpenseRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
    { title: "Voucher No.", dataIndex: "voucherNo", key: "voucherNo" },
    { title: "Account Name", dataIndex: "accountName", key: "accountName", ellipsis: true },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right" as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: "Action",
      key: "action",
      width: 280,
      render: (_: unknown, r: ExpenseRow) => (
        <TableRowActions
          showView
          onView={() => {}}
          onEdit={() => {
            setEditingRow(r)
            setOpenEdit(true)
          }}
          editLoading={editingId === r.id}
          editDisabled={!!editingId && editingId !== r.id}
          onDelete={() => handleDeleteRow(r.id)}
          deleteTitle="Delete expense"
          deleteDescription={`Delete expense ${r.voucherNo}? This cannot be undone.`}
          deleteLoading={deletingId === r.id}
        />
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Expense" }, { label: "History" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search voucher, account..."
          showRefresh
          onRefresh={load}
          className="flex-1"
        >
          <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={() => setOpenAdd(true)}>
            + Add Expense
          </Button>
        </FilterToolbar>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<ExpenseRow>
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
                scroll={{ x: 900 }}
                locale={{ emptyText: loading ? "Loading..." : "No expenses found." }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpenseModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload: unknown) => {
          try {
            await client.post("/api/expenses", payload)
            await load()
            return true
          } catch {
            return false
          }
        }}
      />

      <ExpenseModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => {
          if (!v) setEditingRow(null)
          setOpenEdit(v)
        }}
        initialValues={
          editingRow
            ? {
                items: editingRow.items,
                paymentMethod: editingRow.paymentMethod,
                accountId: editingRow.accountId,
                totalAmount: editingRow.totalAmount,
                date: editingRow.date.slice(0, 10),
                note: editingRow.note,
              }
            : undefined
        }
        onSubmit={async (payload) => {
          if (!editingRow) return false
          try {
            setEditingId(editingRow.id)
            await client.put(`/api/expenses/${editingRow.id}`, payload)
            await load()
            setEditingRow(null)
            setOpenEdit(false)
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
