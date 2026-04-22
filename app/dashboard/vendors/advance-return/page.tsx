"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FilterToolbar from "@/components/shared/filter-toolbar"
import VendorAdvanceReturnModal from "@/components/vendors/vendor-advance-return-modal"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Table, Tag } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"
import { DeleteButton } from "@/components/shared/delete-button"
import { toast } from "sonner"

function parseApiError(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error
  }
  return "Request failed"
}

type VendorAdvanceReturnRow = {
  id: string
  returnDate: string
  voucherNo: string
  vendorName: string
  vendorId: string
  paymentType: string
  paymentDetails: string
  accountId: string
  advanceAmount: number
  returnNote?: string
}

export default function VendorAdvanceReturnPage() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId ?? ""
  const [rows, setRows] = useState<VendorAdvanceReturnRow[]>([])
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
  const [editingRow, setEditingRow] = useState<VendorAdvanceReturnRow | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = search.trim()
        if (next !== prev) setPage(1)
        return next
      })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))
      const res = await fetch(`/api/vendors/advance-return?${params.toString()}`, {
        headers: { "x-company-id": companyId },
      })
      const data = await res.json()
      const items: VendorAdvanceReturnRow[] = Array.isArray(data?.items) ? data.items : []
      const pag = data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total || 0))
      setPage(Number(pag?.page || page))
      setPageSize(Number(pag?.pageSize || pageSize))
    } catch {
      toast.error("Failed to load advance returns")
    } finally {
      setLoading(false)
    }
  }, [companyId, page, pageSize, debouncedSearch, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/vendors/advance-return/${id}`, {
        method: "DELETE",
        headers: { "x-company-id": companyId },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Delete failed")
        return
      }
      toast.success("Record deleted")
      load()
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 56,
      render: (_: unknown, __: VendorAdvanceReturnRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Return Date",
      dataIndex: "returnDate",
      key: "returnDate",
      render: (d: string) => (d ? format(new Date(d), "dd-MM-yyyy") : "—"),
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Vendor Name",
      dataIndex: "vendorName",
      key: "vendorName",
      render: (text: string) => <span className="text-blue-600 font-medium">{text}</span>,
    },
    {
      title: "Advance Amount",
      dataIndex: "advanceAmount",
      key: "advanceAmount",
      align: "right" as const,
      render: (n: number) => <span className="font-semibold">{n.toLocaleString()}</span>,
    },
    {
      title: "Return Note",
      dataIndex: "returnNote",
      key: "returnNote",
      ellipsis: true,
      render: (t: string | undefined) => t || "—",
    },
    {
      title: "Action",
      key: "action",
      width: 240,
      render: (_: unknown, r: VendorAdvanceReturnRow) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <TableRowActions
            showView={false}
            onEdit={() => {
              setEditingRow(r)
              setOpenEdit(true)
            }}
          />
          <DeleteButton
            onDelete={() => handleDelete(r.id)}
            isLoading={deletingId === r.id}
            title="Delete advance return"
            description={`Delete voucher ${r.voucherNo}? This cannot be undone.`}
            size="sm"
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Vendor Advance Return" }]}>
      <div className="mx-4 mb-4 space-y-4">
        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search voucher, vendor, note..."
          showRefresh
          onRefresh={load}
          className="flex-1"
        >
          <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Advance Return
          </Button>
        </FilterToolbar>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<VendorAdvanceReturnRow>
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
                scroll={{ x: 960 }}
                className="border-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <VendorAdvanceReturnModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload) => {
          const amount = Number(payload.advanceAmount || 0)
          const res = await fetch("/api/vendors/advance-return", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-company-id": companyId },
            body: JSON.stringify({
              vendorId: payload.vendorId,
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              accountName: payload.accountName ?? "",
              amount,
              returnDate: payload.returnDate,
              note: payload.returnNote ?? "",
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            toast.error(parseApiError(data))
            return
          }
          toast.success("Advance return created")
          setOpenAdd(false)
          load()
        }}
      />

      <VendorAdvanceReturnModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => {
          if (!v) setEditingRow(null)
          setOpenEdit(v)
        }}
        initialValues={
          editingRow
            ? {
                vendorId: editingRow.vendorId,
                vendorName: editingRow.vendorName,
                paymentMethod: editingRow.paymentType,
                accountId: editingRow.accountId,
                accountName: editingRow.paymentDetails,
                advanceAmount: String(editingRow.advanceAmount),
                returnDate: editingRow.returnDate,
                returnNote: editingRow.returnNote || "",
                presentBalance: "0",
                availableBalance: "",
              }
            : undefined
        }
        onSubmit={async (payload) => {
          if (!editingRow) return
          const amount = Number(payload.advanceAmount || 0)
          const res = await fetch(`/api/vendors/advance-return/${editingRow.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "x-company-id": companyId },
            body: JSON.stringify({
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              accountName: payload.accountName ?? "",
              amount,
              returnDate: payload.returnDate,
              note: payload.returnNote ?? "",
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            toast.error(parseApiError(data))
            return
          }
          toast.success("Updated")
          setOpenEdit(false)
          setEditingRow(null)
          load()
        }}
      />
    </PageWrapper>
  )
}
