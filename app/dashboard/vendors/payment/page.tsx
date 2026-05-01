"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import PaymentModal from "@/components/vendors/payment-modal"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { Card, CardContent } from "@/components/ui/card"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { DateRange } from "react-day-picker"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Table, Tag } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"

type PaymentRow = {
  id: string
  sl: number
  date: string
  voucherNo: string
  paymentTo: string
  vendorInvoice: string
  account: string
  totalPayment: number
  doc: boolean
  note: string
  raw: Record<string, unknown>
}

export default function VendorPaymentPage() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId || ""
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)
  const [data, setData] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [editPayment, setEditPayment] = useState<Record<string, unknown> | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { lookups } = useInvoiceLookups()

  const accountsPreloaded = useMemo(
    () =>
      lookups?.accounts?.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type as string,
      })) || [],
    [lookups?.accounts]
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: "1", pageSize: "50" })
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (dateRange?.from) params.append("startDate", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString().slice(0, 10))

      const res = await fetch(`/api/vendors/payment?${params.toString()}`, {
        headers: { "x-company-id": companyId },
      })
      const result = await res.json()
      if (result.items) {
        const mapped: PaymentRow[] = result.items.map((item: Record<string, unknown>, index: number) => ({
          id: String(item.id),
          sl: index + 1,
          date: String(item.paymentDate ?? ""),
          voucherNo: String(item.voucherNo ?? ""),
          paymentTo:
            item.paymentTo === "invoice"
              ? "Specific Invoice"
              : item.paymentTo === "advance"
                ? "Advance Payment"
                : item.paymentTo === "ticket"
                  ? "Specific Ticket"
                  : "Overall",
          vendorInvoice:
            item.paymentTo === "invoice"
              ? String((item as { invoiceNo?: string }).invoiceNo || (item as { vendorNames?: string }).vendorNames || "")
              : String((item as { vendorName?: string }).vendorName || "N/A"),
          account: String(
            (item as { accountId?: { name?: string } }).accountId?.name ||
              (item as { accountName?: string }).accountName ||
              "N/A"
          ),
          totalPayment: Number(item.totalAmount) || 0,
          doc: !!(item as { voucherImage?: unknown }).voucherImage,
          note: String(item.note ?? ""),
          raw: item,
        }))
        setData(mapped)
      } else {
        setData([])
      }
    } catch (error) {
      console.error("Failed to load payments:", error)
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }, [companyId, debouncedSearch, dateRange])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const handlePaymentSubmit = async (formData: Record<string, unknown>) => {
    try {
      setSaving(true)
      const isEdit = !!editPayment?.id
      const url = isEdit ? `/api/vendors/payment/${editPayment!.id}` : `/api/vendors/payment`
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-company-id": companyId,
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(typeof err.error === "string" ? err.error : "Failed to save payment")
        return
      }

      toast.success(isEdit ? "Payment updated successfully" : "Payment created successfully")
      setOpenModal(false)
      setEditPayment(undefined)
      loadPayments()
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (row: PaymentRow) => {
    const raw = row.raw as Record<string, unknown>
    const ivRaw =
      (raw.invoiceVendors as {
        vendorId?: { _id?: string } | string
        invoiceItemId?: { _id?: string } | string
        amount?: number
      }[]) || []
    const firstIv = ivRaw[0]
    const firstVendorId =
      firstIv && typeof firstIv.vendorId === "object" && firstIv.vendorId
        ? (firstIv.vendorId as { _id?: string })._id
        : firstIv?.vendorId
    const formData = {
      paymentTo: raw.paymentTo,
      invoiceId: (raw.invoiceId as { _id?: string })?._id || raw.invoiceId,
      ticketVendorId: raw.paymentTo === "ticket" && firstVendorId ? String(firstVendorId) : "",
      invoiceVendors: ivRaw.map((v) => ({
        vendorId: typeof v.vendorId === "object" && v.vendorId ? (v.vendorId as { _id: string })._id : v.vendorId,
        invoiceItemId:
          v.invoiceItemId && typeof v.invoiceItemId === "object"
            ? (v.invoiceItemId as { _id?: string })._id
            : v.invoiceItemId,
        amount: v.amount,
      })),
      vendorId: raw.vendorId,
      paymentMethod: raw.paymentMethod,
      accountId: (raw.accountId as { _id?: string })?._id || raw.accountId,
      amount: raw.amount,
      vendorAit: raw.vendorAit,
      totalAmount: raw.totalAmount,
      receiptNo: raw.receiptNo,
      referPassport: raw.referPassport,
      passportNo: raw.passportNo,
      date: raw.paymentDate ? new Date(String(raw.paymentDate)) : new Date(),
      note: raw.note,
    }
    setEditPayment({ id: raw.id, ...formData })
    setOpenModal(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await fetch(`/api/vendors/payment/${id}`, {
        method: "DELETE",
        headers: { "x-company-id": companyId },
      })
      if (!res.ok) {
        toast.error("Failed to delete payment")
        return
      }
      toast.success("Payment deleted successfully")
      loadPayments()
    } catch (error) {
      console.error(error)
      toast.error("Error deleting payment")
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      title: "SL",
      key: "sl",
      width: 60,
      align: "center" as const,
      render: (_: unknown, __: PaymentRow, index: number) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (d: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—"),
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      width: 130,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Payment To",
      dataIndex: "paymentTo",
      key: "paymentTo",
      width: 150,
    },
    {
      title: "Vendor/Invoice",
      dataIndex: "vendorInvoice",
      key: "vendorInvoice",
      width: 200,
      render: (text: string) => <span className="text-blue-600 font-medium">{text}</span>,
    },
    {
      title: "Account",
      dataIndex: "account",
      key: "account",
      width: 180,
    },
    {
      title: "Total Payment",
      dataIndex: "totalPayment",
      key: "totalPayment",
      width: 130,
      align: "right" as const,
      render: (n: number) => <span className="font-semibold">{n.toLocaleString()}</span>,
    },
    {
      title: "Doc",
      dataIndex: "doc",
      key: "doc",
      width: 80,
      align: "center" as const,
      render: (hasDoc: boolean) => (hasDoc ? <Tag color="green">Yes</Tag> : <span className="text-muted-foreground">—</span>),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Action",
      key: "action",
      width: 220,
      render: (_: unknown, row: PaymentRow) => (
        <div className="flex items-center justify-center gap-2">
          <TableRowActions
            onView={() => router.push(`/dashboard/vendors/payment/${row.id}`)}
            onEdit={() => handleEdit(row)}
            onDelete={() => handleDelete(row.id)}
            deleteLoading={deletingId === row.id}
            deleteTitle="Delete payment"
            deleteDescription="Are you sure? This will revert related balance updates."
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Vendor Payments" }]}>
      <div className="min-w-0 space-y-4 px-2 sm:px-4">
        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search voucher, vendor, invoice..."
          showRefresh
          onRefresh={loadPayments}
        >
          <Button
            className="bg-sky-500 hover:bg-sky-600 shrink-0"
            onClick={() => {
              setEditPayment(undefined)
              setOpenModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Payment
          </Button>
        </FilterToolbar>

        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<PaymentRow>
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
              size: "small",
            }}
            scroll={{ x: 1200 }}
            size="middle"
            className="ant-table-responsive"
            locale={{ emptyText: loading ? "Loading…" : "No payments found" }}
          />
        </div>
      </div>

      <PaymentModal
        open={openModal}
        onOpenChange={setOpenModal}
        onSubmit={handlePaymentSubmit}
        accountsPreloaded={accountsPreloaded}
        initialData={editPayment}
        loading={saving}
      />
    </PageWrapper>
  )
}
