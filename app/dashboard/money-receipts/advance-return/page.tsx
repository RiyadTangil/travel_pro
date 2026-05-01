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
import { TableRowActions } from "@/components/shared/table-row-actions"
import { useMemo } from "react"

type AdvanceReturnRow = {
  id: string
  returnDate: string
  voucherNo: string
  clientName: string
  paymentType: string
  paymentDetails: string
  advanceAmount: number
  returnNote?: string
  transactionCharge?: number
  receiptNo?: string
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

  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

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

  const columns = useMemo(() => [
    {
      title: "SL.",
      key: "sl",
      width: 56,
      align: "center" as const,
      render: (_: unknown, __: AdvanceReturnRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Return Date",
      dataIndex: "returnDate",
      key: "returnDate",
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString("en-GB") : "-",
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 200,
      render: (text: string) => <span className="text-blue-500 font-medium">{text}</span>,
    },
    {
      title: "Advance Amount",
      dataIndex: "advanceAmount",
      key: "advanceAmount",
      width: 130,
      align: "right" as const,
      render: (amount: number) => <span className="font-semibold">{amount?.toLocaleString() || 0}</span>,
    },
    {
      title: "Action",
      key: "action",
      fixed: "right" as const,
      width: narrowViewport ? 64 : 200,
      align: narrowViewport ? "center" : undefined,
      render: (_: unknown, r: AdvanceReturnRow) => (
        <TableRowActions
          showView
          onView={() => {
            // View logic if needed
          }}
          onEdit={() => {
            setEditingRow(r)
            setOpenEdit(true)
          }}
          onDelete={() => handleDelete(r.id)}
          deleteLoading={deletingId === r.id}
          deleteTitle="Delete Advance Return"
          deleteDescription={`Are you sure you want to delete advance return ${r.voucherNo}?`}
          compact={narrowViewport}
        />
      ),
    },
  ], [page, pageSize, narrowViewport, deletingId])

  return (
    <PageWrapper breadcrumbs={[{ label: "Money Receipt" }, { label: "Advance Return" }]}>
      <div className="px-2 sm:px-4 mb-4 min-w-0 space-y-4">
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
            className="flex-1 min-w-0"
          >
            <Button className="bg-sky-500 hover:bg-sky-600 shrink-0 whitespace-nowrap" onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Advance Return
            </Button>
          </FilterToolbar>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
              <Table<AdvanceReturnRow>
                columns={columns}
                dataSource={rows}
                rowKey="id"
                loading={loading}
                scroll={{ x: "max-content" }}
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
                  size: "small",
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
        onSuccess={load}
      />

      <AdvanceReturnModal
        open={openEdit}
        mode="edit"
        id={editingRow?.id}
        onOpenChange={(v) => {
          if (!v) setEditingRow(null)
          setOpenEdit(v)
        }}
        initialValues={
          editingRow
            ? {
                clientId: "", // Note: Modal will try to find this by name if empty
                clientName: editingRow.clientName,
                paymentMethod: editingRow.paymentType,
                accountId: "", // Note: Modal will try to find this by name if empty
                accountName: editingRow.paymentDetails,
                advanceAmount: String(editingRow.advanceAmount),
                returnDate: editingRow.returnDate,
                returnNote: editingRow.returnNote || "",
                transactionCharge: editingRow.transactionCharge ? String(editingRow.transactionCharge) : "",
                receiptNo: editingRow.receiptNo || "",
              }
            : undefined
        }
        onSuccess={load}
      />
    </PageWrapper>
  )
}
