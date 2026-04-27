"use client"

import { useEffect, useState, useMemo, useCallback, startTransition, memo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

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

const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  employeeId: z.string().min(1, "Sales By is required"),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  salesDate: z.date({ required_error: "Sales Date is required" }),
  dueDate: z.date().optional(),
  agentId: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export function AddInvoiceModal({ isOpen, onClose, onInvoiceAdded, initialInvoice, lookups }: AddInvoiceModalProps) {
  // Parse 'YYYY-MM-DD' as local date to avoid -1 day shifts
  const { data: session } = useSession()
  const { toast } = useToast()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors, isSubmitting: submitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      employeeId: "",
      invoiceNo: "",
      salesDate: undefined,
      dueDate: undefined,
      agentId: "",
    },
  })

  // Watch values for legacy compat or complex logic
  const clientId = watch("clientId")
  const employeeId = watch("employeeId")
  const agentId = watch("agentId")
  const salesDate = watch("salesDate")
  const dueDate = watch("dueDate")
  const invoiceNo = watch("invoiceNo")


  const [passportData, setPassportData] = useState<any[]>([])
  const [ticketData, setTicketData] = useState<any[]>([])
  const [hotelData, setHotelData] = useState<any[]>([])
  const [transportData, setTransportData] = useState<any[]>([])
  const [moneyReceiptData, setMoneyReceiptData] = useState<any>(null)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [initialBillingItems, setInitialBillingItems] = useState<any[] | undefined>(undefined)
  const [initialBillingTotals, setInitialBillingTotals] = useState<any | undefined>(undefined)
  const [passportsInitial, setPassportsInitial] = useState<any[] | undefined>(undefined)
  const [ticketsInitial, setTicketsInitial] = useState<any[] | undefined>(undefined)
  const [hotelsInitial, setHotelsInitial] = useState<any[] | undefined>(undefined)
  const [transportsInitial, setTransportsInitial] = useState<any[] | undefined>(undefined)
  // Immediate preloaded lists from invoice GET to avoid extra calls
  const [vendorsImmediate, setVendorsImmediate] = useState<Array<{ id: string; name: string; email?: string; mobile?: string }>>([])
  const [employeesImmediate, setEmployeesImmediate] = useState<Array<{ id: string; name: string }>>([])
  const [clientsImmediate, setClientsImmediate] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([])
  const [agentsImmediate, setAgentsImmediate] = useState<Array<{ id: string; name: string; email?: string; mobile?: string }>>([])

  // Memoized lookup-derived props to avoid re-creating arrays every render
  const clientsPreloadedAll = useMemo(() => (
    (clientsImmediate && clientsImmediate.length) ? clientsImmediate : (lookups?.clients?.map(c => ({ id: c.id, name: c.name, uniqueId: c.uniqueId, email: c.email, phone: c.phone })) || [])
  ), [clientsImmediate, lookups?.clients])

  const employeesPreloadedAll = useMemo(() => (
    (employeesImmediate && employeesImmediate.length) ? employeesImmediate : (lookups?.employees?.map(e => ({ id: e.id, name: e.name })) || [])
  ), [employeesImmediate, lookups?.employees])

  const agentsPreloadedAll = useMemo(() => (
    (agentsImmediate && agentsImmediate.length) ? agentsImmediate : (lookups?.agents?.map(a => ({ id: a.id, name: a.name })) || [])
  ), [agentsImmediate, lookups?.agents])

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
    lookups?.products
  ), [lookups?.products])
  const vendorsMemo = useMemo(() => (
    lookups?.vendors
  ), [lookups?.vendors])

  const vendorsPreloadedAll = useMemo(() => (
    (vendorsImmediate && vendorsImmediate.length) ? vendorsImmediate : (vendorsMemo || [])
  ), [vendorsImmediate, vendorsMemo])
  const accountsPreloadedMemo = useMemo(() => (
    lookups?.accounts?.map(a => ({ id: a.id, name: a.name, type: a.type as any }))
  ), [lookups?.accounts])

  const passportsPreloadedMemo = useMemo(() => (
    lookups?.passports?.map(p => ({ id: p.id, passportNo: p.passportNo, name: p.name, mobile: p.mobile, email: p.email, dob: p.dob, dateOfIssue: p.dateOfIssue, dateOfExpire: p.dateOfExpire }))
  ), [lookups?.passports])

  const [employeeName, setEmployeeName] = useState<string>("")
  const [openAddClient, setOpenAddClient] = useState(false)
  const [openAddEmployee, setOpenAddEmployee] = useState(false)
  const [openAddAgent, setOpenAddAgent] = useState(false)
  const [openAddVendor, setOpenAddVendor] = useState(false)
  const [billingData, setBillingData] = useState<{ items: any[]; totals: { subtotal: number; totalCost: number; discount: number; serviceCharge: number; vatTax: number; netTotal: number; agentCommission?: number; invoiceDue?: number; presentBalance?: number; note?: string; reference?: string } } | null>(null)

  // Sync employeeName when employeeId changes
  useEffect(() => {
    if (employeeId && employeesPreloadedAll) {
      const emp = employeesPreloadedAll.find(e => e.id === employeeId)
      if (emp) setEmployeeName(emp.name)
    }
  }, [employeeId, employeesPreloadedAll])

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
          setValue("clientId", inv.clientId)
          setValue("employeeId", inv.employeeId)
          setEmployeeName(inv.salesByName || "")
          setValue("agentId", inv.agentId || "")
          if (inv.salesDate) setValue("salesDate", parseYmdLocal(inv.salesDate)!)
          if (inv.dueDate) setValue("dueDate", parseYmdLocal(inv.dueDate)!)
          
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
          
          if (Array.isArray(data.clients)) setClientsImmediate(data.clients)
          if (Array.isArray(data.agents)) setAgentsImmediate(data.agents)
          
          // Set invoice number for edit mode
          setValue("invoiceNo", inv.invoiceNo || initialInvoice?.invoiceNo || "")
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
      if (match) setValue("employeeId", match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeName, lookups?.employees])

  // Auto-fetch next invoice number when opening for create
  useEffect(() => {
    if (!isOpen) return
    if (initialInvoice?.invoiceNo) { setValue("invoiceNo", initialInvoice.invoiceNo); return }
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/invoices/next-no?type=other')
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setValue("invoiceNo", data.nextInvoiceNo || '')
      } catch {}
    })()
    return () => { active = false }
  }, [isOpen, initialInvoice?.invoiceNo])

  // Reset state when opening Add mode to avoid prefill from previous edit
  useEffect(() => {
    if (!isOpen) return
    if (initialInvoice?.id) return
    reset({
      clientId: "",
      employeeId: "",
      agentId: "",
      invoiceNo: "",
      salesDate: undefined,
      dueDate: undefined,
    })
    setEmployeeName("")
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
    setMoneyReceiptData(null)
    setErrors({})
  }, [isOpen, initialInvoice?.id])

 

  const handleCreate = handleSubmit(async (data: FormData) => {
    // Billing validation
    const billingItems = billingData?.items || []
    if (billingItems.length === 0) {
      setErrors({ billing: "At least one billing item is required" })
      toast({ title: "Validation Error", description: "At least one billing item is required", variant: "destructive" })
      return
    }

    // Money Receipt validation (only if payment method is selected)
    if (moneyReceiptData?.paymentMethod) {
      if (!moneyReceiptData.accountId || !moneyReceiptData.amount || moneyReceiptData.amount <= 0 || !moneyReceiptData.paymentDate) {
        toast({ title: "Validation Error", description: "Please fill in all money receipt fields.", variant: "destructive" })
        return
      }
    }

    try {
      const payload = {
        general: {
          invoiceNo: data.invoiceNo,
          clientId: data.clientId,
          employeeId: data.employeeId,
          salesByName: employeeName,
          agentId: data.agentId,
          salesDate: toYmd(data.salesDate),
          dueDate: data.dueDate ? toYmd(data.dueDate) : "",
        },
        billing: {
          items: billingItems,
          subtotal: billingData?.totals?.subtotal || 0,
          totalCost: billingData?.totals?.totalCost || 0,
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
        moneyReceipt: moneyReceiptData,
        invoiceType: "other"
      }
      const url = initialInvoice?.id ? `/api/invoices/${initialInvoice.id}` : `/api/invoices`
      const method = initialInvoice?.id ? "PUT" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      })
      const resData = await res.json()
      if (!res.ok) {
        if (resData?.error === "credit_limit_exceeded") {
          const desc = resData?.message || (typeof resData?.creditLimit !== 'undefined' ? `Limit: ${resData.creditLimit}, Present: ${resData.presentBalance}, Attempt: ${resData.attemptAmount}` : undefined)
          toast({
            title: "Credit limit exceeded",
            description: desc,
            variant: "destructive",
          })
          return
        }
        toast({
          title: initialInvoice?.id ? "Failed to update invoice" : "Failed to create invoice",
          description: resData?.message || resData?.error || "Unknown error",
          variant: "destructive",
        })
        return
      }
      if (method === "POST") {
        const created = resData.created
        const recAmt = Number(created.invclientpayment_amount || 0)
        const net = Number(created.net_total || 0)
        const newInvoice = {
          id: resData.id,
          invoiceNo: created.invoice_no,
          clientName: created.client_name || "",
          clientPhone: created.mobile || "",
          salesDate: created.invoice_sales_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          dueDate: created.invoice_due_date || "",
          salesPrice: net,
          totalCost: Number(created.invoice_total_vendor_price || 0),
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
    }
  })

  const handleCreatePreview = () => {
    // Use the same API call as Create, but keep current invoiceNo and dates
    handleCreate()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent aria-describedby="add-invoice-desc" className="max-w-[95vw] lg:max-w-[90%] h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              {initialInvoice?.id ? "Edit Invoice" : "Add Invoice"}
            </DialogTitle>
            <DialogDescription id="add-invoice-desc" className="sr-only">
              Fill out invoice details including client, sales, tickets, transport, billing, and payment information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 h-full px-6">
            <div className="space-y-6 py-4">
              {/* General Information */}
              <Card>
                <CardHeader className="flex items-center justify-start space-y-0">
                  <CardTitle className="text-base">General Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:[grid-template-columns:repeat(6,minmax(0,1fr))]">
                    <div className="space-y-2">
                      <Label htmlFor="general[client]">Select Client <span className="text-red-500">*</span></Label>
                      <Controller
                        name="clientId"
                        control={control}
                        render={({ field }) => (
                          <ClientSelect
                            value={field.value}
                            preloaded={clientsPreloadedAll}
                            onChange={(id) => field.onChange(id)}
                            onRequestAdd={onRequestAddClientCb}
                            placeholder="Select client"
                            className={cn(formErrors.clientId && "border-red-500")}
                          />
                        )}
                      />
                      {formErrors.clientId && <p className="text-xs text-red-500 font-medium">{formErrors.clientId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[salesBy]">Sales By <span className="text-red-500">*</span></Label>
                      <Controller
                        name="employeeId"
                        control={control}
                        render={({ field }) => (
                          <EmployeeSelect
                            value={field.value}
                            preloaded={employeesPreloadedAll}
                            onChange={(id) => field.onChange(id)}
                            onRequestAdd={onRequestAddEmployeeCb}
                            placeholder="Select staff"
                            className={cn(formErrors.employeeId && "border-red-500")}
                          />
                        )}
                      />
                      {formErrors.employeeId && <p className="text-xs text-red-500 font-medium">{formErrors.employeeId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[invoiceNo]">Invoice No<span className="text-red-500"> *</span></Label>
                      <Controller
                        name="invoiceNo"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            {...field}
                            readOnly 
                            placeholder="Auto-generated" 
                            className={cn(formErrors.invoiceNo && "border-red-500 bg-red-50")}
                          />
                        )}
                      />
                      {formErrors.invoiceNo && <p className="text-xs text-red-500 font-medium">{formErrors.invoiceNo.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Sales Date <span className="text-red-500">*</span></Label>
                      <Controller
                        name="salesDate"
                        control={control}
                        render={({ field }) => (
                          <DateInput 
                            value={field.value} 
                            onChange={field.onChange} 
                            className={cn(formErrors.salesDate && "border-red-500")}
                          />
                        )}
                      />
                      {formErrors.salesDate && <p className="text-xs text-red-500 font-medium">{formErrors.salesDate.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Controller
                        name="dueDate"
                        control={control}
                        render={({ field }) => (
                          <DateInput value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general[agent]">Select Agent</Label>
                      <Controller
                        name="agentId"
                        control={control}
                        render={({ field }) => (
                          <AgentSelect
                            value={field.value}
                            preloaded={agentsPreloadedAll}
                            onChange={(id) => field.onChange(id)}
                            onRequestAdd={onRequestAddAgentCb}
                            placeholder="Select agent"
                          />
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passport Information */}
              <MemoPassportInformation 
                initialEntries={passportsInitial} 
                onChange={onPassportChange} 
                passportsPreloaded={passportsPreloadedMemo}
                errors={errors} 
              />

              <Separator />

              {/* Ticket Information */}
              <MemoTicketInformation initialEntries={ticketsInitial} onChange={onTicketChange} airlineOptionsExternal={airlineOptionsExternalMemo} airportListExternal={airportsMemo} errors={errors}
              />

              <Separator />

              {/* Hotel Information */}
              <MemoHotelInformation initialEntries={hotelsInitial} onChange={onHotelChange} errors={errors} />

              <Separator />

              {/* Transport Information */}
              <MemoTransportInformation initialEntries={transportsInitial} onChange={onTransportChange} transportTypeNamesExternal={transportTypeNamesMemo} errors={errors} />

              <Separator />

              {/* Billing Information */}
              <MemoBillingInformation
                onRequestAddVendor={onRequestAddVendorCb}
                onChange={onBillingChange}
                initialItems={initialBillingItems}
                initialTotals={initialBillingTotals}
                vendorPreloaded={vendorsPreloadedAll}
                productOptionsExternal={productOptionsExternalMemo}
                errors={errors}
              />

              <Separator />

              {/* Money Receipt */}
              {!initialInvoice?.id && (
                <MemoMoneyReceipt accountsPreloaded={accountsPreloadedMemo} onChange={(p) => setMoneyReceiptData(p)} errors={errors} />
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? (initialInvoice?.id ? "Updating…" : "Creating…") : (initialInvoice?.id ? "Update" : "Create")}
            </Button>
            {!initialInvoice?.id && (
              <Button onClick={handleCreatePreview} disabled={submitting} variant="secondary" className="bg-blue-500 hover:bg-blue-600">
                {submitting ? "Creating…" : "Create & Preview"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Initial data loaded via useEffect when editing */}
      {/* Modals for adding new entries */}
      <AddClientModal 
        open={openAddClient} 
        onOpenChange={(v) => setOpenAddClient(v)} 
        onSubmit={async (payload) => { 
          try {
            const companyId = (session?.user as any)?.companyId
            const res = await fetch('/api/clients-manager', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(companyId ? { 'x-company-id': String(companyId) } : {})
              },
              body: JSON.stringify({
                ...payload,
                ...(companyId ? { companyId: String(companyId) } : {})
              })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create client')
            
            if (data.client?.id) {
              setValue("clientId", data.client.id)
              toast({ title: "Success", description: "Client created successfully" })
            }
            setOpenAddClient(false)
          } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
          }
        }} 
      />
      <EmployeeModal 
        open={openAddEmployee} 
        onClose={() => setOpenAddEmployee(false)} 
        onSubmit={async (payload) => { 
          try {
            const res = await fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create employee')
            
            if (data.id) {
              setValue("employeeId", data.id)
              setEmployeeName(payload.name)
              toast({ title: "Success", description: "Employee created successfully" })
            }
            setOpenAddEmployee(false)
          } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
          }
        }} 
      />
      <AgentModal 
        open={openAddAgent} 
        onClose={() => setOpenAddAgent(false)} 
        onSubmit={async (payload) => { 
          try {
            const res = await fetch('/api/agents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create agent')
            
            if (data.id) {
              setValue("agentId", data.id)
              toast({ title: "Success", description: "Agent created successfully" })
            }
            setOpenAddAgent(false)
          } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
          }
        }} 
      />
      <VendorAddModal
        open={openAddVendor}
        onOpenChange={(v) => setOpenAddVendor(v)}
        onSubmit={async (v) => {
          const companyId = (session?.user as any)?.companyId ?? null
          await fetch(`/api/vendors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...v, companyId })
          })
          setOpenAddVendor(false)
        }}
      />
    </>
  )
}
