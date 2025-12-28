"use client"

import { useEffect, useState, useMemo, useCallback, startTransition, memo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { CustomDropdown } from "./custom-dropdown"
import ClientSelect from "@/components/clients/client-select"
import EmployeeSelect from "@/components/employees/employee-select"
import AgentSelect from "@/components/agents/agent-select"
import AddClientModal from "@/components/clients/add-client-modal"
import { EmployeeModal } from "@/components/employees/employee-modal"
import { AgentModal } from "@/components/agents/agent-modal"

import { TicketInformation } from "./ticket-information"
import { HotelInformation } from "./hotel-information"
import { TransportInformation } from "./transport-information"
import { BillingInformation } from "./billing-information"
import { MoneyReceipt } from "./money-receipt"
import { PassportInformation } from "./passport-information"
import { Invoice } from "@/types/invoice"
import { generateMRNumber } from "@/data/invoices"
import { VendorAddModal } from "@/components/vendors/vendor-add-modal"
import { useSession } from "next-auth/react"
import { toast } from "@/components/ui/use-toast"

interface AddInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded?: (invoice: Invoice) => void
  initialInvoice?: Invoice
  lookups?: {
    employees?: { id: string; name: string }[]
    agents?: { id: string; name: string }[]
    vendors?: { id: string; name: string; email?: string; mobile?: string }[]
    clients?: { id: string; name: string; uniqueId?: number; email?: string; phone?: string }[]
    products?: { id: string; name: string }[]
    airlines?: { id: string; name: string }[]
    transportTypes?: { id: string; name: string }[]
    accounts?: { id: string; name: string; type: string }[]
    airports?: { code: string; name: string; country?: string }[]
    passports?: { id: string; passportNo: string; name?: string; mobile?: string; email?: string; dob?: string; dateOfIssue?: string; dateOfExpire?: string }[]
  }
}

export const parseYmdLocal = (s?: string): Date | undefined => {
  if (!s) return undefined
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(s)
  if (!m) return new Date(s)
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  if (!isFinite(y) || !isFinite(mo) || !isFinite(d)) return new Date(s)
  return new Date(y, mo - 1, d)
}
export const toYmd = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
export function AddInvoiceModal({ isOpen, onClose, onInvoiceAdded, initialInvoice, lookups }: AddInvoiceModalProps) {
  // Parse 'YYYY-MM-DD' as local date to avoid -1 day shifts
  const { data: session } = useSession()
  const [clientId, setClientId] = useState<string | undefined>()
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [employeeName, setEmployeeName] = useState<string>("")
  const [agentId, setAgentId] = useState<string | undefined>()
  const [salesDate, setSalesDate] = useState<Date | undefined>(undefined)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [openAddClient, setOpenAddClient] = useState(false)
  const [openAddEmployee, setOpenAddEmployee] = useState(false)
  const [openAddAgent, setOpenAddAgent] = useState(false)
  const [openAddVendor, setOpenAddVendor] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    passport: [],
    ticket: [],
    hotel: [],
    transport: [],
    billing: [],
    moneyReceipt: {}
  })
  const [billingData, setBillingData] = useState<{ items: any[]; totals: { subtotal: number; discount: number; serviceCharge: number; vatTax: number; netTotal: number; agentCommission?: number; invoiceDue?: number; presentBalance?: number; note?: string; reference?: string } } | null>(null)
  const [passportData, setPassportData] = useState<any[]>([])
  const [ticketData, setTicketData] = useState<any[]>([])
  const [hotelData, setHotelData] = useState<any[]>([])
  const [transportData, setTransportData] = useState<any[]>([])
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [initialBillingItems, setInitialBillingItems] = useState<any[] | undefined>(undefined)
  const [initialBillingTotals, setInitialBillingTotals] = useState<any | undefined>(undefined)
  const [passportsInitial, setPassportsInitial] = useState<any[] | undefined>(undefined)
  const [ticketsInitial, setTicketsInitial] = useState<any[] | undefined>(undefined)
  const [hotelsInitial, setHotelsInitial] = useState<any[] | undefined>(undefined)
  const [transportsInitial, setTransportsInitial] = useState<any[] | undefined>(undefined)
  const [invoiceNo, setInvoiceNo] = useState<string>("")
  // Immediate preloaded lists from invoice GET to avoid extra calls
  const [vendorsImmediate, setVendorsImmediate] = useState<Array<{ id: string; name: string; email?: string; mobile?: string }>>([])
  const [employeesImmediate, setEmployeesImmediate] = useState<Array<{ id: string; name: string }>>([])

  // Memoized lookup-derived props to avoid re-creating arrays every render
  const clientsPreloaded = useMemo(() => (
    lookups?.clients?.map(c => ({ id: c.id, name: c.name, uniqueId: c.uniqueId, email: c.email, phone: c.phone }))
  ), [lookups?.clients])
  const employeesPreloaded = useMemo(() => (
    lookups?.employees?.map(e => ({ id: e.id, name: e.name }))
  ), [lookups?.employees])
  const agentsPreloaded = useMemo(() => (
    lookups?.agents?.map(a => ({ id: a.id, name: a.name }))
  ), [lookups?.agents])
  const airlineOptionsExternalMemo = useMemo(() => (
    lookups?.airlines?.map(a => a.name)
  ), [lookups?.airlines])
  const airportsMemo = useMemo(() => (
    lookups?.airports
  ), [lookups?.airports])
  const transportTypeNamesMemo = useMemo(() => (
    lookups?.transportTypes?.map(t => t.name)
  ), [lookups?.transportTypes])
  const productOptionsExternalMemo = useMemo(() => (
    lookups?.products?.map(p => p.name)
  ), [lookups?.products])
  const vendorsMemo = useMemo(() => (
    lookups?.vendors
  ), [lookups?.vendors])
  const employeesPreloadedAll = useMemo(() => (
    (employeesImmediate && employeesImmediate.length) ? employeesImmediate : (employeesPreloaded || [])
  ), [employeesImmediate, employeesPreloaded])
  const vendorsPreloadedAll = useMemo(() => (
    (vendorsImmediate && vendorsImmediate.length) ? vendorsImmediate : (vendorsMemo || [])
  ), [vendorsImmediate, vendorsMemo])
  const accountsPreloadedMemo = useMemo(() => (
    lookups?.accounts?.map(a => ({ id: a.id, name: a.name, type: a.type as any }))
  ), [lookups?.accounts])

  const passportsPreloadedMemo = useMemo(() => (
    lookups?.passports?.map(p => ({ id: p.id, passportNo: p.passportNo, name: p.name, mobile: p.mobile, email: p.email, dob: p.dob, dateOfIssue: p.dateOfIssue, dateOfExpire: p.dateOfExpire }))
  ), [lookups?.passports])

  // Stable handlers to reduce child re-renders
  const onPassportChange = useCallback((p: any[]) => { startTransition(() => setPassportData(p)) }, [])
  const onTicketChange = useCallback((p: any[]) => { startTransition(() => setTicketData(p)) }, [])
  const onHotelChange = useCallback((p: any[]) => { startTransition(() => setHotelData(p)) }, [])
  const onTransportChange = useCallback((p: any[]) => { startTransition(() => setTransportData(p)) }, [])
  const onBillingChange = useCallback((p: { items: any[]; totals: any }) => {
    // Mark this update as non-urgent to keep typing responsive
    startTransition(() => {
      setBillingData({ items: p.items, totals: p.totals })
    })
  }, [])

  // Memoized callbacks for inline handlers that were re-created each render
  const onRequestAddClientCb = useCallback(() => setOpenAddClient(true), [])
  const onRequestAddEmployeeCb = useCallback(() => setOpenAddEmployee(true), [])
  const onRequestAddAgentCb = useCallback(() => setOpenAddAgent(true), [])
  const onRequestAddVendorCb = useCallback(() => setOpenAddVendor(true), [])

  // Memoized section components to prevent re-renders when props are unchanged
  const MemoPassportInformation = useMemo(() => memo(PassportInformation), [])
  const MemoTicketInformation = useMemo(() => memo(TicketInformation), [])
  const MemoHotelInformation = useMemo(() => memo(HotelInformation), [])
  const MemoTransportInformation = useMemo(() => memo(TransportInformation), [])
  const MemoBillingInformation = useMemo(() => memo(BillingInformation), [])
  const MemoMoneyReceipt = useMemo(() => memo(MoneyReceipt), [])

  // Load initial details when editing
  useEffect(() => {
    if (!isOpen || !initialInvoice?.id) return
    let active = true
    setLoadingInitial(true)
      ; (async () => {
        try {
          const res = await fetch(`/api/invoices/${initialInvoice.id}`)
          if (!res.ok) { return }
          const data = await res.json()
          const inv = data.invoice
          console.log("inv.employeeId =>", inv.employeeId, inv.employeeName)
          console.log("inv =>", inv)
          if (!inv || !active) return
          setClientId(inv.clientId)
          setEmployeeId(inv.employeeId)
          setEmployeeName(inv.salesByName || "")
          setAgentId(inv.agentId)
          setSalesDate(inv.salesDate ? parseYmdLocal(inv.salesDate) : undefined)
          setDueDate(inv.dueDate ? parseYmdLocal(inv.dueDate) : undefined)
          setInitialBillingTotals(inv.billing || {})
          setInitialBillingItems((inv.billing?.items || []).map((i: any, idx: number) => ({ id: i.id || String(Date.now() + idx), ...i, vendor: i.vendor ?? i.vendorId ?? "" })))
          setPassportsInitial(inv.passports || [])
          setTicketsInitial(inv.tickets || [])
          setHotelsInitial(inv.hotels || [])
          setTransportsInitial(inv.transports || [])
          // Preload vendors and employee to prevent extra fetches in selects
          if (Array.isArray(data.vendors)) setVendorsImmediate(data.vendors)
          if (Array.isArray(data.employees)) setEmployeesImmediate(data.employees.map((e: any) => ({ id: e.id, name: e.name })))
          else if (inv.employeeId && (inv.salesByName || "").trim()) setEmployeesImmediate([{ id: inv.employeeId, name: inv.salesByName }])
          // Set invoice number for edit mode
          setInvoiceNo(inv.invoiceNo || initialInvoice?.invoiceNo || "")
        } catch (e) {
          // ignore
        } finally {
          if (active) setLoadingInitial(false)
        }
      })()
    return () => { active = false }
  }, [isOpen, initialInvoice?.id])

  // Resolve Sales By id from name when editing and id missing
  useEffect(() => {
    if (!employeeId && employeeName && lookups?.employees && lookups.employees.length) {
      const match = lookups.employees.find(e => (e.name || '').trim().toLowerCase() === employeeName.trim().toLowerCase())
      if (match) setEmployeeId(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeName, lookups?.employees])

  // Auto-fetch next invoice number when opening for create
  useEffect(() => {
    if (!isOpen) return
    if (initialInvoice?.invoiceNo) { setInvoiceNo(initialInvoice.invoiceNo); return }
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/invoices/next-no')
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setInvoiceNo(data.nextInvoiceNo || '')
      } catch {}
    })()
    return () => { active = false }
  }, [isOpen, initialInvoice?.invoiceNo])

  // Reset state when opening Add mode to avoid prefill from previous edit
  useEffect(() => {
    if (!isOpen) return
    if (initialInvoice?.id) return
    setClientId(undefined)
    setEmployeeId(undefined)
    setEmployeeName("")
    setAgentId(undefined)
    setSalesDate(undefined)
    setDueDate(undefined)
    setInitialBillingTotals(undefined)
    setInitialBillingItems(undefined)
    setPassportsInitial(undefined)
    setTicketsInitial(undefined)
    setHotelsInitial(undefined)
    setTransportsInitial(undefined)
    setPassportData([])
    setTicketData([])
    setHotelData([])
    setTransportData([])
    setBillingData(null)
  }, [isOpen, initialInvoice?.id])

  const buildInvoice = (): Invoice => {
    const invoiceNo = (document.getElementById("general[invoiceNo]") as HTMLInputElement | null)?.value?.trim() || ""
    const salesDateIso = salesDate ? salesDate.toISOString() : new Date().toISOString()

    // Basic defaults until sections are fully wired
    const salesPrice = 0
    const receivedAmount = 0
    const dueAmount = salesPrice - receivedAmount

    const status: Invoice['status'] = dueAmount <= 0 ? 'paid' : receivedAmount > 0 ? 'partial' : 'due'

    return {
      id: Date.now().toString(),
      invoiceNo,
      clientName: "Unknown Client",
      clientPhone: "",
      passportNo: "",
      salesDate: salesDateIso,
      salesPrice,
      receivedAmount,
      dueAmount,
      status,
      salesBy: "Unknown",
      mrNo: receivedAmount > 0 ? generateMRNumber() : "",
      notes: ""
    }
  }

  const handleCreate = () => {
    const invoiceNoInput = (document.getElementById("general[invoiceNo]") as HTMLInputElement | null)?.value?.trim()
    if (!clientId) { alert("Select Client is required."); return }
    if (!employeeId) { alert("Sales By is required."); return }
    if (!invoiceNoInput) { alert("Invoice No is required."); return }
    if (!salesDate) { alert("Sales Date is required."); return }
    // Vendor required only if Cost Price has a value (> 0)
    const billingItems = billingData?.items || []
    const missingVendor = billingItems.some((i) => Number(i.costPrice) > 0 && !(i.vendor || "").trim())
    if (missingVendor) { alert("Vendor is required when Cost Price is provided."); return }

    setSubmitting(true)
      ; (async () => {
        try {
          const payload = {
            general: {
              invoiceNo: invoiceNoInput,
              client: clientId,
              salesBy: employeeId,
              salesByName: employeeName,
              agent: agentId,
              salesDate: toYmd(salesDate),
              dueDate: dueDate ? toYmd(dueDate) : "",
            },
            billing: {
              items: billingItems,
              subtotal: billingData?.totals?.subtotal || 0,
              discount: billingData?.totals?.discount || 0,
              serviceCharge: billingData?.totals?.serviceCharge || 0,
              vatTax: billingData?.totals?.vatTax || 0,
              netTotal: billingData?.totals?.netTotal || 0,
              note: billingData?.totals?.note || "",
              reference: billingData?.totals?.reference || "",
            },
            passport: passportData,
            ticket: ticketData,
            hotel: hotelData,
            transport: transportData,
          }
          const url = initialInvoice?.id ? `/api/invoices/${initialInvoice.id}` : `/api/invoices`
          const method = initialInvoice?.id ? "PUT" : "POST"
          const res = await fetch(url, {
            method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
              ...payload,
              // send synonyms for compatibility across POST/PUT handlers
              passports: passportData,
              tickets: ticketData,
              hotels: hotelData,
              transports: transportData,
            })
          })
          const data = await res.json()
          if (!res.ok) {
            if (data?.error === "credit_limit_exceeded") {
              const desc = data?.message || (typeof data?.creditLimit !== 'undefined' ? `Limit: ${data.creditLimit}, Present: ${data.presentBalance}, Attempt: ${data.attemptAmount}` : undefined)
              toast({
                title: "Credit limit exceeded",
                description: desc,
                variant: "destructive",
              })
              return
            }
            toast({
              title: initialInvoice?.id ? "Failed to update invoice" : "Failed to create invoice",
              description: data?.message || data?.error || "Unknown error",
              variant: "destructive",
            })
            return
          }
          if (method === "POST") {
            const created = data.created
            const recAmt = Number(created.invclientpayment_amount || 0)
            const net = Number(created.net_total || 0)
            const newInvoice = {
              id: data.id,
              invoiceNo: created.invoice_no,
              clientName: created.client_name || "",
              clientPhone: created.mobile || "",
              salesDate: created.invoice_sales_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              dueDate: created.invoice_due_date || "",
              salesPrice: net,
              receivedAmount: recAmt,
              dueAmount: Math.max(0, net - recAmt),
              mrNo: created.money_receipt_num || "",
              passportNo: created.passport_no || "",
              salesBy: created.sales_by || "",
              agent: "",
              status: recAmt >= net ? 'paid' as const : (recAmt > 0 ? 'partial' as const : 'due' as const),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            onInvoiceAdded?.(newInvoice)
          }
          onClose()
        } catch (e: any) {
          toast({
            title: initialInvoice?.id ? "Update failed" : "Create failed",
            description: e?.message || "Unexpected error",
            variant: "destructive",
          })
        } finally {
          setSubmitting(false)
        }
      })()
  }

  const handleCreatePreview = () => {
    // Use the same API call as Create, but keep current invoiceNo and dates
    handleCreate()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent aria-describedby="add-invoice-desc" className="max-w-[95vw] lg:max-w-[90%] h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">Add Invoice</DialogTitle>
            <DialogDescription id="add-invoice-desc" className="sr-only">
              Fill out invoice details including client, sales, tickets, transport, billing, and payment information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 h-full px-6">
            <div className="space-y-6 py-4">
              {/* General Information */}
              <Card>
                <CardHeader className="flex items-center justify-between space-y-0">
                  <CardTitle className="text-base">General Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:[grid-template-columns:repeat(6,minmax(0,1fr))]">
                    <div className="space-y-2">
                      <Label htmlFor="general[client]">Select Client <span className="text-red-500">*</span></Label>
                      <ClientSelect
                        value={clientId}
                        onChange={(id) => setClientId(id)}
                        preloaded={clientsPreloaded}
                        onRequestAdd={onRequestAddClientCb}
                        placeholder="Select client"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[salesBy]">Sales By <span className="text-red-500">*</span></Label>
                      <EmployeeSelect
                        value={employeeId}
                        onChange={(id) => setEmployeeId(id)}
                        // onChange={(id, selected) => { setEmployeeId(id); setEmployeeName(selected?.name || "") }}

                        preloaded={employeesPreloadedAll}
                        onRequestAdd={onRequestAddEmployeeCb}
                        placeholder="Select staff"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[invoiceNo]">Invoice No<span className="text-red-500"> *</span></Label>
                      <Input id="general[invoiceNo]" value={invoiceNo} readOnly placeholder="Auto-generated from backend" />
                    </div>

                    <div className="space-y-2">
                      <Label>Sales Date <span className="text-red-500">*</span></Label>
                      <DateInput value={salesDate} onChange={setSalesDate} />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <DateInput value={dueDate} onChange={setDueDate} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[agent]">Select Agent</Label>
                      <AgentSelect
                        value={agentId}
                        onChange={(id) => setAgentId(id)}
                        preloaded={agentsPreloaded}
                        onRequestAdd={onRequestAddAgentCb}
                        placeholder="Select agent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passport Information */}
              <MemoPassportInformation initialEntries={passportsInitial} onChange={onPassportChange} passportsPreloaded={passportsPreloadedMemo} />

              <Separator />

              {/* Ticket Information */}
              <MemoTicketInformation initialEntries={ticketsInitial} onChange={onTicketChange} airlineOptionsExternal={airlineOptionsExternalMemo} airportListExternal={airportsMemo}
              />

              <Separator />

              {/* Hotel Information */}
              <MemoHotelInformation initialEntries={hotelsInitial} onChange={onHotelChange} />

              <Separator />

              {/* Transport Information */}
              <MemoTransportInformation initialEntries={transportsInitial} onChange={onTransportChange} transportTypeNamesExternal={transportTypeNamesMemo} />

              <Separator />

              {/* Billing Information */}
              <MemoBillingInformation
                onRequestAddVendor={onRequestAddVendorCb}
                onChange={onBillingChange}
                initialItems={initialBillingItems}
                initialTotals={initialBillingTotals}
                vendorPreloaded={vendorsPreloadedAll}
                productOptionsExternal={productOptionsExternalMemo}
              />

              <Separator />

              {/* Money Receipt */}
              <MemoMoneyReceipt accountsPreloaded={accountsPreloadedMemo} />
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button onClick={handleCreatePreview} disabled={submitting} variant="secondary" className="bg-blue-500 hover:bg-blue-600">
              {submitting ? "Creating…" : "Create & Preview"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Initial data loaded via useEffect when editing */}
      {/* Modals for adding new entries */}
      <AddClientModal open={openAddClient} onOpenChange={(v) => setOpenAddClient(v)} onSubmit={async () => { setOpenAddClient(false) }} />
      <EmployeeModal open={openAddEmployee} onClose={() => setOpenAddEmployee(false)} onSubmit={async () => { setOpenAddEmployee(false) }} />
      <AgentModal open={openAddAgent} onClose={() => setOpenAddAgent(false)} onSubmit={async () => { setOpenAddAgent(false) }} />
      <VendorAddModal
        open={openAddVendor}
        onOpenChange={(v) => setOpenAddVendor(v)}
        onSubmit={async (v) => {
          await fetch(`/api/vendors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...v, companyId: session?.user?.companyId ?? null })
          })
          setOpenAddVendor(false)
        }}
      />
    </>
  )
}
