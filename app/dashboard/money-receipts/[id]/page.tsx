"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReceiptAdjustModal from "@/components/money-receipts/ReceiptAdjustModal"
// import ReceiptAdjustModal from "@/components/money-receipts/ReceiptAdjustModal"

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
    ;(async () => {
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

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/money-receipts">Money Receipt</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>View Money Receipt</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => router.push("/dashboard/money-receipts")}>Return to Money Receipt List</Button>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="single">Single Copy</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice">
          <div className="rounded-md border bg-white p-4 h-[60vh] flex items-center justify-center text-muted-foreground">
            Invoice content will appear here
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="rounded-md border bg-white">
            <div className="flex items-center justify-between p-4">
              <div className="text-lg font-semibold">Receipt Details</div>
              {paymentTo === "advance" && (
                <Button onClick={() => setOpenAdjust(true)}>Add Invoice</Button>
              )}
            </div>
            <div className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SL</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Sales Date</TableHead>
                    <TableHead>Payment Amount</TableHead>
                    <TableHead>Invoice Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((row, idx) => (
                    <TableRow key={row.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{new Date(row.paymentDate).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>{row.invoiceNo}</TableCell>
                      <TableCell>{new Date(row.salesDate).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>{Number(row.paymentAmount || 0).toLocaleString()}</TableCell>
                      <TableCell>{Number(row.invoiceAmount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No allocations yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="single">
          <div className="rounded-md border bg-white p-4 h-[60vh] flex items-center justify-center text-muted-foreground">
            Single copy view will appear here
          </div>
        </TabsContent>
      </Tabs>

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
  )
}
