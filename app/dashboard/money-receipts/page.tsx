"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import FilterBar from "@/components/money-receipts/FilterBar"
import ReceiptListTable from "@/components/money-receipts/ReceiptListTable"
import ReceiptFormModal from "@/components/money-receipts/ReceiptFormModal"
import type { MoneyReceipt } from "@/components/money-receipts/types"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"

export default function MoneyReceiptsPage() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<MoneyReceipt[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ id: string; defaults: Partial<MoneyReceipt> } | null>(null)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  const { lookups } = useInvoiceLookups()
  const clientsPreloaded = useMemo(() => (
    lookups?.clients?.map(c => ({ id: c.id, name: c.name, uniqueId: c.uniqueId, email: c.email, phone: c.phone })) || []
  ), [lookups?.clients])
  const accountsPreloaded = useMemo(() => (
    lookups?.accounts?.map(a => ({ id: a.id, name: a.name, type: a.type as any })) || []
  ), [lookups?.accounts])
  const paymentTos = useMemo(() => ([
    { id: "overall", label: "Over All" },
    { id: "advance", label: "Advance Payment" },
    { id: "invoice", label: "Specific Invoice" },
    { id: "tickets", label: "Specific Tickets" },
    { id: "adjust", label: "Adjust With Due" },
  ]), [])

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchesSearch = search
        ? [r.clientName, r.voucherNo, r.accountName, r.paymentMethod].some(v => v.toLowerCase().includes(search.toLowerCase()))
        : true
      const date = new Date(r.paymentDate).toISOString().slice(0, 10)
      const inStart = startDate ? date >= startDate : true
      const inEnd = endDate ? date <= endDate : true
      return matchesSearch && inStart && inEnd
    })
  }, [rows, search, startDate, endDate])

  const handleCreateOrEdit = (receipt: MoneyReceipt) => {
    if (editing?.id) {
      setRows(prev => prev.map(r => (r.id === editing.id ? { ...r, ...receipt } : r)))
      setEditing(null)
    } else {
      setRows(prev => [receipt, ...prev])
    }
  }

  const onView = (id: string) => {
    const r = rows.find(x => x.id === id)
    if (r) alert(`Money Receipt\nVoucher: ${r.voucherNo}\nClient: ${r.clientName}\nAmount: ${r.paidAmount}`)
  }

  const onEdit = (id: string) => {
    const r = rows.find(x => x.id === id)
    if (!r) return
    setEditing({ id, defaults: r })
    setOpen(true)
  }

  const onDelete = async (id: string) => {
    setLoadingRowId(id)
    try {
      const res = await fetch(`/api/money-receipts/${id}`, {
        method: "DELETE",
        headers: { "x-company-id": session?.user?.companyId ?? "" },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to delete")
      setRows(prev => prev.filter(x => x.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRowId(null)
    }
  }

  const loadReceipts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/money-receipts?page=1&pageSize=50`, {
        headers: { "x-company-id": session?.user?.companyId ?? "" },
      })
      const json = await res.json()
      const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json?.data?.items) ? json.data.items : [])
      const mapped: MoneyReceipt[] = items.map((it: any) => ({
        id: String(it.id || it._id || crypto.randomUUID()),
        paymentDate: String(it.receipt_payment_date || new Date().toISOString()),
        voucherNo: String(it.receipt_vouchar_no || ""),
        clientId: String(it.client_id || ""),
        clientName: String(it.client_name || "Unknown"),
        invoiceId: it.invoice_id ? String(it.invoice_id) : undefined,
        invoiceType: String(it.receipt_payment_to || "OVERALL") === "INVOICE" ? "INVOICE" : "OVERALL",
        paymentTo: String(it.receipt_payment_to || "overall").toLowerCase(),
        paymentMethod: String(it.acctype_name || ""),
        accountId: String(it.receipt_account_id || ""),
        accountName: String(it.account_name || ""),
        manualReceiptNo: it.receipt_money_receipt_no || undefined,
        amount: Number(it.receipt_total_amount || 0),
        discount: 0,
        paidAmount: Number(it.receipt_total_amount || 0),
        presentDue: undefined,
        note: String(it.receipt_note || ""),
        docOneName: it.receipt_scan_copy || undefined,
        docTwoName: it.receipt_scan_copy2 || undefined,
        showBalance: true,
      }))
      setRows(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/money-receipts?page=1&pageSize=50`, {
          headers: { "x-company-id": session?.user?.companyId ?? "" },
        })
        const json = await res.json()
        const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json?.data?.items) ? json.data.items : [])
        const mapped: MoneyReceipt[] = items.map((it: any) => ({
          id: String(it.id || it._id || crypto.randomUUID()),
          paymentDate: String(it.receipt_payment_date || new Date().toISOString()),
          voucherNo: String(it.receipt_vouchar_no || ""),
          clientId: String(it.client_id || ""),
          clientName: String(it.client_name || "Unknown"),
          invoiceId: it.invoice_id ? String(it.invoice_id) : undefined,
          invoiceType: String(it.receipt_payment_to || "OVERALL") === "INVOICE" ? "INVOICE" : "OVERALL",
          paymentTo: String(it.receipt_payment_to || "overall").toLowerCase(),
          paymentMethod: String(it.acctype_name || ""),
          accountId: String(it.receipt_account_id || ""),
          accountName: String(it.account_name || ""),
          manualReceiptNo: it.receipt_money_receipt_no || undefined,
          amount: Number(it.receipt_total_amount || 0),
          discount: 0,
          paidAmount: Number(it.receipt_total_amount || 0),
          presentDue: undefined,
          note: String(it.receipt_note || ""),
          docOneName: it.receipt_scan_copy || undefined,
          docTwoName: it.receipt_scan_copy2 || undefined,
          showBalance: true,
        }))
        setRows(mapped)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.user?.companyId])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Money Receipts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Money Receipt
        </Button>
        <FilterBar
          startDate={startDate}
          endDate={endDate}
          search={search}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearchChange={setSearch}
          onRefresh={() => { setSearch(""); setStartDate(undefined); setEndDate(undefined); loadReceipts() }}
        />
      </div>

      {/* Table */}
      <ReceiptListTable rows={filteredRows} onView={onView} onEdit={onEdit} onDelete={onDelete} loading={loading} loadingRowId={loadingRowId} />

      {/* Form Modal */}
      <ReceiptFormModal
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}
        onSubmit={handleCreateOrEdit}
        clientsPreloaded={clientsPreloaded}
        accountsPreloaded={accountsPreloaded}
        paymentTos={paymentTos}
        defaults={editing?.defaults}
        mode={editing ? "edit" : "create"}
        editId={editing?.id}
      />
    </div>
  )
}
