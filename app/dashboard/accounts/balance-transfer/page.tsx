"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import BalanceTransferModal from "@/components/accounts/BalanceTransferModal"
import { DateRange } from "react-day-picker"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Table } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"

type BalanceTransferRow = {
  id: string
  date: string
  voucherNo: string
  transferFromId: string
  transferFromName: string
  transferToId: string
  transferToName: string
  amount: number
  transferCharge: number
  totalAmount: number
  note: string
}

export default function BalanceTransferPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<BalanceTransferRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingRow, setEditingRow] = useState<BalanceTransferRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

      const res = await client.get(`/api/balance-transfer?${params.toString()}`)
      const data = res.data?.data ?? res.data
      const items = data?.items ?? []
      const pagination = data?.pagination ?? {}
      setRows(items)
      setTotal(Number(pagination.total ?? 0))
    } catch (e) {
      console.error(e)
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

  const handleAdd = () => {
    setEditingRow(null)
    setModalMode("add")
    setOpenModal(true)
  }

  const handleEdit = (row: BalanceTransferRow) => {
    setEditingRow(row)
    setModalMode("edit")
    setOpenModal(true)
  }

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id)
    try {
      await client.delete(`/api/balance-transfer/${id}`)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleModalSubmit = async (values: {
    transferFromId: string
    transferToId: string
    amount: string
    transferCharge: string
    date: string
    note?: string
  }) => {
    const payload = {
      transferFromId: values.transferFromId,
      transferToId: values.transferToId,
      amount: Number(values.amount),
      transferCharge: values.transferCharge === "" ? 0 : Number(values.transferCharge),
      date: typeof values.date === "string" ? values.date : new Date(values.date as unknown as Date).toISOString().slice(0, 10),
      note: values.note ?? "",
    }
    try {
      if (modalMode === "add") {
        await client.post("/api/balance-transfer", payload)
      } else if (editingRow?.id) {
        await client.put(`/api/balance-transfer/${editingRow.id}`, payload)
      }
      await load()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const modalInitial = editingRow
    ? {
        transferFromId: editingRow.transferFromId,
        transferToId: editingRow.transferToId,
        amount: String(editingRow.amount),
        transferCharge: String(editingRow.transferCharge ?? 0),
        date: editingRow.date.slice(0, 10),
        note: editingRow.note ?? "",
      }
    : undefined

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: unknown, __: BalanceTransferRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
    { title: "Voucher No", dataIndex: "voucherNo", key: "voucherNo" },
    { title: "Transfer From", dataIndex: "transferFromName", key: "transferFromName" },
    { title: "Transfer To", dataIndex: "transferToName", key: "transferToName" },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: "Charge",
      dataIndex: "transferCharge",
      key: "transferCharge",
      align: "right" as const,
      render: (v: number) => Number(v ?? 0).toLocaleString(),
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right" as const,
      render: (v: number) => <span className="font-semibold">{Number(v).toLocaleString()}</span>,
    },
    {
      title: "Action",
      key: "action",
      width: 260,
      render: (_: unknown, r: BalanceTransferRow) => (
        <TableRowActions
          showView
          onView={() => {}}
          onEdit={() => handleEdit(r)}
          onDelete={() => handleDeleteRow(r.id)}
          deleteTitle="Delete balance transfer"
          deleteDescription={`Delete transfer ${r.voucherNo}? This cannot be undone.`}
          deleteLoading={deletingId === r.id}
        />
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts", href: "/dashboard/accounts" }, { label: "Balance Transfer" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterToolbar
            showDateRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            showSearch
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search voucher, note..."
            showRefresh
            onRefresh={load}
            className="flex-1"
          >
            <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Balance Transfer
            </Button>
          </FilterToolbar>
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<BalanceTransferRow>
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
                scroll={{ x: 1000 }}
                locale={{ emptyText: loading ? "Loading..." : "No balance transfers found." }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <BalanceTransferModal
        open={openModal}
        onOpenChange={setOpenModal}
        mode={modalMode}
        initialValues={modalInitial}
        onSubmit={handleModalSubmit}
      />
    </PageWrapper>
  )
}
