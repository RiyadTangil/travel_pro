"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, Tag } from "antd"
import AdvanceReturnModal from "@/components/money-receipts/AdvanceReturnModal"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { DateRange } from "react-day-picker"
import { Plus } from "lucide-react"
import { DeleteButton } from "@/components/shared/delete-button"

type AdvanceReturnRow = {
  id: string
  returnDate: string
  voucherNo: string
  clientName: string
  paymentType: string
  paymentDetails: string
  advanceAmount: number
  returnNote?: string
}

export default function AdvanceReturnPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<AdvanceReturnRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<AdvanceReturnRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))
      const res = await fetch(`/api/advance-returns?${params.toString()}`, { headers: { "x-company-id": session?.user?.companyId ?? "" } })
      const data = await res.json()
      const items: AdvanceReturnRow[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
      const pag = data?.pagination || data?.data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total || 0))
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
    load()
  }, [load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/advance-returns/${id}`, { method: "DELETE", headers: { "x-company-id": session?.user?.companyId ?? "" } })
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
      width: 60,
      render: (_: unknown, __: AdvanceReturnRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Return Date",
      dataIndex: "returnDate",
      key: "returnDate",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      render: (text: string) => <span className="text-blue-500 font-medium">{text}</span>,
    },
    {
      title: "Advance Amount",
      dataIndex: "advanceAmount",
      key: "advanceAmount",
      align: "right" as const,
      render: (amount: number) => <span className="font-semibold">{amount.toLocaleString()}</span>,
    },
    {
      title: "Action",
      key: "action",
      width: 220,
      render: (_: unknown, r: AdvanceReturnRow) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" className="bg-slate-100 hover:bg-slate-200 h-8 px-3">
            View
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 h-8 px-3"
            onClick={() => {
              setEditingRow(r)
              setOpenEdit(true)
            }}
          >
            Edit
          </Button>
          <DeleteButton
            onDelete={() => handleDelete(r.id)}
            isLoading={deletingId === r.id}
            title="Delete Advance Return"
            description={`Are you sure you want to delete advance return ${r.voucherNo}?`}
            size="sm"
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Money Receipt" }, { label: "Advance Return" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterToolbar
            showDateRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            showSearch
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search voucher, client..."
            showRefresh
            onRefresh={load}
            className="flex-1"
          >
            <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Advance Return
            </Button>
          </FilterToolbar>
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<AdvanceReturnRow>
                columns={columns}
                dataSource={rows}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps)
                  },
                  showSizeChanger: true,
                  showTotal: (t) => `Total ${t} items`,
                }}
                className="border-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <AdvanceReturnModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async () => {
          await load()
          return true
        }}
      />

      <AdvanceReturnModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => {
          if (!v) setEditingRow(null)
          setOpenEdit(v)
        }}
        initialValues={
          editingRow
            ? {
                clientId: "",
                clientName: editingRow.clientName,
                paymentMethod: editingRow.paymentType,
                accountId: "",
                accountName: editingRow.paymentDetails,
                advanceAmount: String(editingRow.advanceAmount),
                returnDate: editingRow.returnDate,
                returnNote: editingRow.returnNote || "",
              }
            : undefined
        }
        onSubmit={async () => {
          await load()
          return true
        }}
      />
    </PageWrapper>
  )
}
