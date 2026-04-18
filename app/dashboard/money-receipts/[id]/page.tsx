"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Tabs, Table, Tag } from "antd"
import ReceiptAdjustModal from "@/components/money-receipts/ReceiptAdjustModal"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Plus } from "lucide-react"

type AllocationRow = {
  id: string
  paymentDate: string
  invoiceNo: string
  salesDate: string
  paymentAmount: number
  invoiceAmount: number
}

export default function ViewMoneyReceiptPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const search = useSearchParams()

  const moneyReceiptId = String(params?.id || "")
  const voucherNo = search.get("voucherNo") || ""
  const clientId = search.get("clientId") || ""
  const clientName = search.get("clientName") || ""
  const paymentDate = search.get("paymentDate") || new Date().toISOString()
  const paidAmount = Number(search.get("paidAmount") || 0)
  const paymentTo = (search.get("paymentTo") || "").toLowerCase()

  const [openAdjust, setOpenAdjust] = useState(false)
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [loading, setLoading] = useState(false)

  const remainingAmount = useMemo(() => {
    const applied = allocations.reduce((s, a) => s + Number(a.paymentAmount || 0), 0)
    return Math.max(0, paidAmount - applied)
  }, [allocations, paidAmount])

  useEffect(() => {
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setLoading(true)
          const res = await fetch(`/api/money-receipts/${moneyReceiptId}/allocations`, {
            signal: ctrl.signal,
            headers: { "x-company-id": session?.user?.companyId ?? "" },
          })
          const json = await res.json()
          const items = Array.isArray(json?.items) ? json.items : []
          const mapped: AllocationRow[] = items.map((it: any) => ({
            id: String(it.id || crypto.randomUUID()),
            paymentDate: String(it.paymentDate || new Date().toISOString()),
            invoiceNo: String(it.invoiceNo || ""),
            salesDate: String(it.salesDate || new Date().toISOString()),
            paymentAmount: Number(it.paymentAmount || 0),
            invoiceAmount: Number(it.invoiceAmount || 0),
          }))
          setAllocations(mapped)
        } finally {
          setLoading(false)
        }
      })()
    return () => ctrl.abort()
  }, [moneyReceiptId, session?.user?.companyId])

  const columns = [
    {
      title: "SL",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
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
      render: (text: string) => <Tag color="blue">{text}</Tag>,
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
      render: (amount: number) => <span className="font-semibold text-green-600">{amount.toLocaleString()}</span>,
    },
    {
      title: "Invoice Amount",
      dataIndex: "invoiceAmount",
      key: "invoiceAmount",
      align: "right" as const,
      render: (amount: number) => amount.toLocaleString(),
    },
  ]

  const tabItems = [
    {
      key: "invoice",
      label: "Invoice",
      children: (
        <div className="rounded-md border bg-white p-4 h-[60vh] flex items-center justify-center text-muted-foreground shadow-sm">
          Invoice content will appear here
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      children: (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
            <div className="text-lg font-semibold text-gray-800">Receipt Details</div>
            {paymentTo === "advance" && (
              <Button 
                onClick={() => setOpenAdjust(true)}
                className="bg-sky-500 hover:bg-sky-600 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Invoice
              </Button>
            )}
          </div>
          <div className="p-0">
            <Table
              columns={columns}
              dataSource={allocations}
              rowKey="id"
              loading={loading}
              pagination={false}
              className="border-none"
            />
          </div>
        </div>
      ),
    },
    {
      key: "single",
      label: "Single Copy",
      children: (
        <div className="rounded-md border bg-white p-4 h-[60vh] flex items-center justify-center text-muted-foreground shadow-sm">
          Single copy view will appear here
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Money Receipt" }, { label: "View Money Receipt" }]}>

      <div className="space-y-6 px-4">

        <div className="flex items-center justify-between pt-2">
          <div className="space-x-3">
            <Button 
              variant="outline"
              onClick={() => router.push("/dashboard/money-receipts")}
            >
              Return to Money Receipt List
            </Button>
            <Button 
              className="bg-sky-500 hover:bg-sky-600"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        </div>

        <Tabs 
          defaultActiveKey="details" 
          items={tabItems} 
          className="bg-white p-4 rounded-lg border shadow-sm"
        />

        <ReceiptAdjustModal
          open={openAdjust}
          onOpenChange={(o) => setOpenAdjust(o)}
          paymentDate={paymentDate}
          remainingAmount={remainingAmount}
          clientId={clientId}
          onSubmit={async (rows) => {
            try {
              const payload = rows.map(r => ({ invoiceId: r.invoiceId, amount: r.amount, paymentDate: r.paymentDate }))
              const res = await fetch(`/api/money-receipts/${moneyReceiptId}/allocations`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" },
                body: JSON.stringify(payload),
              })
              const json = await res.json()
              if (!res.ok) throw new Error(json?.error || "Failed to allocate")
              const reload = await fetch(`/api/money-receipts/${moneyReceiptId}/allocations`, { headers: { "x-company-id": session?.user?.companyId ?? "" } })
              const j2 = await reload.json()
              const items = Array.isArray(j2?.items) ? j2.items : []
              const mapped: AllocationRow[] = items.map((it: any) => ({
                id: String(it.id || crypto.randomUUID()),
                paymentDate: String(it.paymentDate || new Date().toISOString()),
                invoiceNo: String(it.invoiceNo || ""),
                salesDate: String(it.salesDate || new Date().toISOString()),
                paymentAmount: Number(it.paymentAmount || 0),
                invoiceAmount: Number(it.invoiceAmount || 0),
              }))
              setAllocations(mapped)
            } catch (e) {
              console.error(e)
            }
          }}
          voucherNo={voucherNo}
          clientName={clientName}
        />
      </div>
    </PageWrapper>
  )
}
