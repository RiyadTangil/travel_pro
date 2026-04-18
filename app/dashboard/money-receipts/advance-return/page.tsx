"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, Tag } from "antd"
import AdvanceReturnModal from "@/components/money-receipts/AdvanceReturnModal"
import FilterBar from "@/components/money-receipts/FilterBar"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { DateRange } from "react-day-picker"
import { Loader2, Plus } from "lucide-react"
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
  const [search, setSearch] = useState<string>("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<AdvanceReturnRow | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dOk = (() => {
        if (dateRange?.from && new Date(r.returnDate) < dateRange.from) return false
        if (dateRange?.to && new Date(r.returnDate) > dateRange.to) return false
        return true
      })()
      const q = search.trim().toLowerCase()
      const sOk = !q || [r.voucherNo, r.clientName, r.paymentType, r.paymentDetails].some((v) => v.toLowerCase().includes(q))
      return dOk && sOk
    })
  }, [rows, dateRange, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (search) params.set("search", search)
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))
      const res = await fetch(`/api/advance-returns?${params.toString()}`, { headers: { "x-company-id": session?.user?.companyId ?? "" } })
      const data = await res.json()
      const items: AdvanceReturnRow[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
      const pag = data?.pagination || data?.data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total || 0))
      setPage(Number(pag?.page || page))
      setPageSize(Number(pag?.pageSize || pageSize))
    } catch { } finally { setLoading(false) }
  }, [session?.user?.companyId, page, pageSize, search, dateRange])

  useEffect(() => { load() }, [load])

  const handleRefresh = () => { load() }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/advance-returns/${id}`, { method: "DELETE", headers: { "x-company-id": session?.user?.companyId ?? "" } })
      load()
    } catch { }
    setDeletingId(null)
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
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
      render: (_: any, r: AdvanceReturnRow) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white hover:text-white">View</Button>
          <Button
            variant="default"
            size="sm"
            className="bg-sky-500 hover:bg-sky-600"
            onClick={() => { setEditingRow(r); setOpenEdit(true) }}
          >
            Edit
          </Button>
          <DeleteButton
            onDelete={() => handleDelete(r.id)}
            isLoading={deletingId === r.id}
            title="Delete Advance Return"
            description={`Are you sure you want to delete advance return ${r.voucherNo}?`}
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Money Receipt" }, { label: "Advance Return" }]}>
      <div className="flex items-center justify-between px-2 mb-4">
        <div>
          <Button onClick={() => setOpenAdd(true)} className="bg-sky-500 hover:bg-sky-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Advance Return
          </Button>
        </div>
        <FilterBar
          dateRange={dateRange}
          search={search}
          onDateRangeChange={setDateRange}
          onSearchChange={setSearch}
          onRefresh={handleRefresh}
        />
      </div>
      <Card className="mx-2">
        <CardContent className="p-0">
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
            }}
            className="border-none"
          />
        </CardContent>
      </Card>

      <AdvanceReturnModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async () => { load(); return true }}
      />

      <AdvanceReturnModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => { if (!v) setEditingRow(null); setOpenEdit(v) }}
        initialValues={editingRow ? {
          clientId: "", // Need to find from somewhere or modal handles it
          clientName: editingRow.clientName,
          paymentMethod: editingRow.paymentType,
          accountId: "",
          accountName: editingRow.paymentDetails,
          advanceAmount: String(editingRow.advanceAmount),
          returnDate: editingRow.returnDate,
          returnNote: editingRow.returnNote || "",
        } : undefined}
        onSubmit={async () => { load(); return true }}
      />
    </PageWrapper>
  )
}
