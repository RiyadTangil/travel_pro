"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, Table, Tag } from "antd"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import VendorPaymentAllocateModal from "@/components/vendors/VendorPaymentAllocateModal"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceVendorRow = {
  vendorId: string
  vendorName: string
  invoiceItemId: string
  ticketLabel: string
  totalCost: number
  paid: number
  due: number
  amount: number
}

type AllocationRow = {
  id: string
  paymentDate: string
  invoiceNo: string
  salesDate: string
  paymentAmount: number
  invoiceAmount: number
}

type VendorPaymentDetail = {
  id: string
  voucherNo: string
  paymentTo: "overall" | "advance" | "invoice" | "ticket"
  paymentDate: string
  paymentMethod: string
  amount: number
  vendorAit: number
  totalAmount: number
  receiptNo: string
  note: string
  referPassport: string
  passportNo: string
  vendorId: string
  vendorName: string
  accountName: string
  invoiceNo: string
  invoiceSalesDate: string
  invoiceVendors: InvoiceVendorRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYMENT_TO_LABEL: Record<string, string> = {
  overall: "Overall",
  advance: "Advance Payment",
  invoice: "Specific Invoice",
  ticket: "Specific Ticket",
}

function paymentToColor(paymentTo: string): string {
  switch (paymentTo) {
    case "invoice": return "blue"
    case "ticket": return "purple"
    case "advance": return "orange"
    default: return "default"
  }
}

function formatDate(value: string | undefined): string {
  if (!value) return "—"
  try { return format(new Date(value), "dd MMM yyyy") } catch { return value }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VendorPaymentViewPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()

  const paymentId = String(params?.id || "")
  const companyId = session?.user?.companyId ?? ""

  const [payment, setPayment] = useState<VendorPaymentDetail | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(true)

  const [openAllocate, setOpenAllocate] = useState(false)
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [allocLoading, setAllocLoading] = useState(false)
  const [totalPaid, setTotalPaid] = useState(0)

  const isLinePayment = payment?.paymentTo === "invoice" || payment?.paymentTo === "ticket"
  const isAllocatable = payment?.paymentTo === "overall" || payment?.paymentTo === "advance"

  // Remaining is computed from totalPaid minus applied allocations
  const remainingAmount = useMemo(() => {
    const applied = allocations.reduce((s, a) => s + Number(a.paymentAmount || 0), 0)
    return Math.max(0, totalPaid - applied)
  }, [allocations, totalPaid])

  // ---------------------------------------------------------------------------
  // Fetch payment detail
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!paymentId || !companyId) return
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setPaymentLoading(true)
          const res = await fetch(`/api/vendors/payment/${paymentId}`, {
            signal: ctrl.signal,
            headers: { "x-company-id": companyId },
          })
          if (!res.ok) throw new Error("Not found")
          const data = await res.json()
          setPayment(data as VendorPaymentDetail)
          setTotalPaid(Math.max(0, Number(data?.amount || 0)))
        } catch {
          setPayment(null)
        } finally {
          setPaymentLoading(false)
        }
      })()
    return () => ctrl.abort()
  }, [paymentId, companyId])

  // ---------------------------------------------------------------------------
  // Fetch allocations (only for overall/advance — determined after payment loads)
  // ---------------------------------------------------------------------------
  const fetchAllocations = async () => {
    if (!paymentId || !companyId) return
    try {
      setAllocLoading(true)
      const res = await fetch(`/api/vendors/payment/${paymentId}/allocations`, {
        headers: { "x-company-id": companyId },
      })
      const json = await res.json()
      const items: AllocationRow[] = (Array.isArray(json?.items) ? json.items : []).map(
        (it: any) => ({
          id: String(it.id || crypto.randomUUID()),
          paymentDate: String(it.paymentDate || new Date().toISOString()),
          invoiceNo: String(it.invoiceNo || ""),
          salesDate: String(it.salesDate || new Date().toISOString()),
          paymentAmount: Number(it.paymentAmount || 0),
          invoiceAmount: Number(it.invoiceAmount || 0),
        })
      )
      setAllocations(items)
      if (json?.totalPaid) setTotalPaid(Math.max(0, Number(json.totalPaid)))
    } finally {
      setAllocLoading(false)
    }
  }

  useEffect(() => {
    if (isAllocatable && companyId) fetchAllocations()
  }, [isAllocatable, companyId, paymentId])

  // ---------------------------------------------------------------------------
  // Allocation columns (overall / advance)
  // ---------------------------------------------------------------------------
  const allocationColumns = [
    {
      title: "SL",
      key: "sl",
      width: 60,
      render: (_: any, __: AllocationRow, index: number) => index + 1,
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text: string) => <Tag color="blue">{text || "—"}</Tag>,
    },
    {
      title: "Sales Date",
      dataIndex: "salesDate",
      key: "salesDate",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
    },
    {
      title: "Payment Amount",
      dataIndex: "paymentAmount",
      key: "paymentAmount",
      align: "right" as const,
      render: (amount: number) => (
        <span className="font-semibold text-green-600">{amount.toLocaleString()}</span>
      ),
    },
    {
      title: "Invoice Amount",
      dataIndex: "invoiceAmount",
      key: "invoiceAmount",
      align: "right" as const,
      render: (amount: number) => amount.toLocaleString(),
    },
  ]

  // ---------------------------------------------------------------------------
  // Invoice / Ticket line columns (invoice / ticket)
  // ---------------------------------------------------------------------------
  const isTicket = payment?.paymentTo === "ticket"

  const lineColumns = [
    {
      title: "SL",
      key: "sl",
      width: 56,
      render: (_: unknown, __: InvoiceVendorRow, index: number) => index + 1,
    },
    {
      title: isTicket ? "Ticket" : "Vendor",
      key: "label",
      render: (_: unknown, row: InvoiceVendorRow) =>
        isTicket ? (
          <span className="font-medium">{row.ticketLabel || "—"}</span>
        ) : (
          <span className="text-blue-600 font-medium">{row.vendorName || "—"}</span>
        ),
    },
    {
      title: "Total Cost",
      dataIndex: "totalCost",
      key: "totalCost",
      align: "right" as const,
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: "Paid (before)",
      dataIndex: "paid",
      key: "paid",
      align: "right" as const,
      render: (n: number) => <span className="text-amber-600">{n.toLocaleString()}</span>,
    },
    {
      title: "This Payment",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (n: number) => (
        <span className="font-semibold text-green-600">{n.toLocaleString()}</span>
      ),
    },
  ]

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  const tabItems = [
    {
      key: "invoice",
      label: "Invoice",
      children: (
        <div className="rounded-md border bg-white p-6 h-[55vh] flex items-center justify-center text-muted-foreground shadow-sm">
          Invoice print view will appear here
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      children: (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b bg-gray-50/60">
            <div className="space-y-0.5">
              <p className="text-lg font-semibold text-gray-800">
                {payment?.voucherNo ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(payment?.paymentDate)} · {payment?.vendorName || "—"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {payment && (
                <Tag color={paymentToColor(payment.paymentTo)}>
                  {PAYMENT_TO_LABEL[payment.paymentTo] ?? payment.paymentTo}
                </Tag>
              )}
              {payment?.invoiceNo && (
                <Tag color="cyan">Invoice: {payment.invoiceNo}</Tag>
              )}
              <Badge variant="outline" className="text-base font-semibold px-3 py-1">
                {payment?.totalAmount.toLocaleString() ?? "—"} TK
              </Badge>
              {isAllocatable && (
                <Button
                  onClick={() => setOpenAllocate(true)}
                  className="bg-sky-500 hover:bg-sky-600 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Body */}
          {isLinePayment ? (
            <Table<InvoiceVendorRow>
              columns={lineColumns}
              dataSource={payment?.invoiceVendors ?? []}
              rowKey={(r) => r.invoiceItemId || r.vendorId}
              loading={paymentLoading}
              pagination={false}
              className="border-none"
              summary={(rows) => {
                const total = rows.reduce((s, r) => s + r.amount, 0)
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      <span className="font-semibold text-gray-700">Total Paid This Session</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <span className="font-semibold text-green-600">{total.toLocaleString()}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
            />
          ) : (
            <Table<AllocationRow>
              columns={allocationColumns}
              dataSource={allocations}
              rowKey="id"
              loading={allocLoading}
              pagination={false}
              className="border-none"
            />
          )}
        </div>
      ),
    },
  ]

  const handleOnSubmit = async (rows: any[]) => {
    const payload = rows.map((r) => ({
      invoiceId: r.invoiceId,
      amount: r.amount,
      paymentDate: r.paymentDate,
    }))
    const res = await fetch(`/api/vendors/payment/${paymentId}/allocations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": companyId,
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || "Failed to allocate")
    await fetchAllocations()
  }
  return (
    <PageWrapper
      breadcrumbs={[
        { label: "Vendor Payments", href: "/dashboard/vendors/payment" },
        { label: payment?.voucherNo ?? "View Payment" },
      ]}
    >
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={() => router.push("/dashboard/vendors/payment")}>
            Back to List
          </Button>
          <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => window.print()}>
            Print
          </Button>
        </div>

        <Tabs
          defaultActiveKey="details"
          items={tabItems}
          className="bg-white p-4 rounded-lg border shadow-sm"
        />
      </div>

      {payment && (
        <VendorPaymentAllocateModal
          open={openAllocate}
          onOpenChange={setOpenAllocate}
          paymentDate={payment.paymentDate}
          remainingAmount={remainingAmount}
          vendorId={payment.vendorId}
          companyId={companyId}
          voucherNo={payment.voucherNo}
          vendorName={payment.vendorName}
          onSubmit={handleOnSubmit}
        />
      )}
    </PageWrapper>
  )
}
