"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import NonInvoiceIncomeModal from "@/components/accounts/NonInvoiceIncomeModal"
import { DateRange } from "react-day-picker"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Table } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"

type NonInvoiceIncomeRow = {
  id: string
  date: string
  voucherNo: string
  companyName: string
  nonInvoiceCompanyId: string
  accountId: string
  accountName: string
  paymentMethod: string
  amount: number
  note: string
}

export default function NonInvoiceIncomePage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<NonInvoiceIncomeRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingRow, setEditingRow] = useState<NonInvoiceIncomeRow | null>(null)
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

      const res = await client.get(`/api/non-invoice-incomes?${params.toString()}`)
      const data = res.data
      setRows(data.items || [])
      setTotal(Number(data.pagination?.total ?? 0))
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

  const handleEdit = (row: NonInvoiceIncomeRow) => {
    setEditingRow(row)
    setModalMode("edit")
    setOpenModal(true)
  }

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id)
    try {
      await client.delete(`/api/non-invoice-incomes/${id}`)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleModalSubmit = async (values: {
    nonInvoiceCompanyId: string
    paymentMethod: string
    accountId: string
    amount: string
    date: string
    note?: string
  }) => {
    const payload = {
      nonInvoiceCompanyId: values.nonInvoiceCompanyId,
      paymentMethod: values.paymentMethod,
      accountId: values.accountId,
      amount: Number(values.amount),
      date: values.date,
      note: values.note ?? "",
    }
    try {
      if (modalMode === "add") {
        await client.post("/api/non-invoice-incomes", payload)
      } else if (editingRow?.id) {
        await client.put(`/api/non-invoice-incomes/${editingRow.id}`, payload)
      }
      await load()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const modalInitialValues = editingRow
    ? {
        nonInvoiceCompanyId: editingRow.nonInvoiceCompanyId,
        paymentMethod: editingRow.paymentMethod,
        accountId: editingRow.accountId,
        amount: String(editingRow.amount),
        date: editingRow.date.slice(0, 10),
        note: editingRow.note ?? "",
      }
    : undefined

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: unknown, __: NonInvoiceIncomeRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
    { title: "Voucher No", dataIndex: "voucherNo", key: "voucherNo" },
    { title: "Company", dataIndex: "companyName", key: "companyName" },
    { title: "Transaction Type", dataIndex: "paymentMethod", key: "paymentMethod" },
    { title: "Transaction Details", dataIndex: "accountName", key: "accountName" },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (v: number) => <span className="font-semibold">{Number(v).toLocaleString()}</span>,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text: string) => <span title={text}>{text || "—"}</span>,
    },
    {
      title: "Action",
      key: "action",
      width: 260,
      render: (_: unknown, r: NonInvoiceIncomeRow) => (
        <TableRowActions
          showView
          onView={() => {}}
          onEdit={() => handleEdit(r)}
          onDelete={() => handleDeleteRow(r.id)}
          deleteTitle="Delete non-invoice income"
          deleteDescription={`Delete voucher ${r.voucherNo}? This cannot be undone.`}
          deleteLoading={deletingId === r.id}
        />
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts", href: "/dashboard/accounts" }, { label: "Non-Invoice Income" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterToolbar
            showDateRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            showSearch
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search voucher, company, account, note..."
            showRefresh
            onRefresh={load}
            className="flex-1"
          >
            <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Non-Invoice Income
            </Button>
          </FilterToolbar>
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<NonInvoiceIncomeRow>
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
                locale={{ emptyText: loading ? "Loading..." : "No records found." }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <NonInvoiceIncomeModal
        open={openModal}
        onOpenChange={setOpenModal}
        mode={modalMode}
        initialValues={modalInitialValues}
        onSubmit={handleModalSubmit}
      />
    </PageWrapper>
  )
}
