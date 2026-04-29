"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Minus } from "lucide-react"

import { SharedModal } from "@/components/shared/shared-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import FileUploadButton from "./FileUploadButton"
import type { MoneyReceipt } from "./types"
import ClientSelect from "@/components/clients/client-select"
import { DateInput } from "@/components/ui/date-input"
import type { AccountType } from "@/components/accounts/types"
import { toast } from "@/components/ui/use-toast"

type ClientItem = { id: string; name: string; uniqueId?: number; email?: string; phone?: string }
type AccountOptionItem = { id: string; name: string; type: AccountType }

const schema = z.object({
  clientId: z.string({ required_error: "Client is required" }),
  presentDue: z.number().optional(),
  presentBalance: z.number().optional(),
  paymentTo: z.string({ required_error: "Payment To is required" }),
  paymentMethod: z.string({ required_error: "Payment Method is required" }),
  accountId: z.string({ required_error: "Account is required" }),
  amount: z.coerce.number().min(0.01, "Amount is required"),
  discount: z.coerce.number().min(0).optional(),
  paymentDate: z.string({ required_error: "Payment Date is required" }),
  manualReceiptNo: z.string().optional(),
  note: z.string().optional(),
  showBalance: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (receipt: MoneyReceipt) => void
  clientsPreloaded?: ClientItem[]
  accountsPreloaded?: AccountOptionItem[]
  paymentTos?: { id: string; label: string }[]
  defaults?: Partial<MoneyReceipt>
  mode?: "create" | "edit"
  editId?: string
}

export default function ReceiptFormModal({ open, onOpenChange, onSubmit, clientsPreloaded, accountsPreloaded, paymentTos, defaults, mode = "create", editId }: Props) {
  const { data: session } = useSession()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaults?.clientId ?? "",
      presentDue: defaults?.presentDue ?? 0,
      paymentTo: defaults?.paymentTo ?? "overall",
      paymentMethod: defaults?.paymentMethod ?? "",
      accountId: defaults?.accountId ?? "",
      amount: defaults?.amount ?? 0,
      discount: defaults?.discount ?? 0,
      paymentDate: defaults?.paymentDate ?? new Date().toISOString().slice(0, 10),
      manualReceiptNo: defaults?.manualReceiptNo ?? "",
      note: defaults?.note ?? "",
      showBalance: defaults?.showBalance ?? true,
    },
  })

  const [docOne, setDocOne] = useState<File | undefined>(undefined)
  const [docTwo, setDocTwo] = useState<File | undefined>(undefined)
  const [clients, setClients] = useState<ClientItem[]>(clientsPreloaded || [])
  const paymentMethod = form.watch("paymentMethod")
  const selectedClientId = form.watch("clientId")
  const paymentToVal = form.watch("paymentTo")

  type InvoiceListItem = {
    id: string
    clientId: string
    invoiceNo: string
    invoiceType?: string
    salesDate: string
    salesPrice: number
    receivedAmount: number
    dueAmount: number
  }

  type InvoiceRow = {
    invoiceId: string
    amount: number
  }

  type TicketItem = {
    id: string          // InvoiceItem _id
    invoiceId: string
    invoiceNo: string
    ticketNo: string
    paxName: string
    salesDate: string
    totalSales: number
    receivedAmount: number
    dueAmount: number
  }

  type TicketRow = {
    ticketId: string    // InvoiceItem _id
    invoiceId: string
    amount: number
  }

  const [invoiceItems, setInvoiceItems] = useState<InvoiceListItem[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  // Multi-row support for specific invoice
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([{ invoiceId: "", amount: 0 }])
  // Multi-row support for specific tickets
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([])
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([{ ticketId: "", invoiceId: "", amount: 0 }])

  const [submitting, setSubmitting] = useState(false)
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])

  // Kept for backward compat (edit mode)
  const [selectedInvoiceId] = useState<string>(mode === "edit" && defaults?.paymentTo === "invoice" && defaults?.invoiceId ? String(defaults.invoiceId) : "")

  const filteredAccounts = useMemo(() => {
    if (!accountsPreloaded || !paymentMethod) return []
    return accountsPreloaded.filter(a => a.type === (paymentMethod as AccountType))
  }, [accountsPreloaded, paymentMethod])

  // simple voucher generator for UI-only
  const nextVoucher = useMemo(() => {
    const number = Math.floor(1000 + Math.random() * 9000)
    return `MR-${number}`
  }, [open])

  useEffect(() => {
    if (open) {
      form.reset({
        clientId: defaults?.clientId ?? "",
        presentDue: defaults?.presentDue ?? 0,
        paymentTo: defaults?.paymentTo ?? "overall",
        paymentMethod: defaults?.paymentMethod ?? "",
        accountId: defaults?.accountId ?? "",
        amount: defaults?.amount ?? 0,
        discount: defaults?.discount ?? 0,
        paymentDate: defaults?.paymentDate ? new Date(defaults.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        manualReceiptNo: mode === "create" ? "" : (defaults?.manualReceiptNo ?? ""),
        note: defaults?.note ?? "",
        showBalance: defaults?.showBalance ?? true,
      })
      const ctrl = new AbortController()
      ;(async () => {
        try {
          const res = await fetch(`/api/account-types`, { signal: ctrl.signal })
          const data = await res.json()
          const items: string[] = Array.isArray(data?.items) ? data.items.map((i: any) => String(i.name)) : []
          setPaymentMethodOptions(items.length ? items : ["Cash", "Bank", "Mobile banking", "Credit Card"])
        } catch {
          setPaymentMethodOptions(["Cash", "Bank", "Mobile banking", "Credit Card"])
        }
      })()
      return () => ctrl.abort()
    }
  }, [open, defaults, form, mode, nextVoucher])

  useEffect(() => {
    // Load Present Due when client changes
    const id = selectedClientId
    if (!id) { form.setValue("presentDue", 0); return }
    let active = true
      ; (async () => {
        try {
          const res = await fetch(`/api/clients-manager/${id}`)
          if (!res.ok) return
          const data = await res.json()
          const bal = typeof data?.presentBalance === "number" ? data.presentBalance : 0

          if (active) form.setValue("presentDue", Number(bal) || 0)
        } catch { }
      })()
    return () => { active = false }
  }, [selectedClientId])

  useEffect(() => {
    // Load invoices for selected client when Payment To is 'invoice'
    if (paymentToVal !== "invoice" || !selectedClientId) { setInvoiceItems([]); return }
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setInvoiceLoading(true)
          const res = await fetch(`/api/invoices?page=1&pageSize=100&clientId=${encodeURIComponent(selectedClientId)}`, { signal: ctrl.signal })
          if (!res.ok) return
          const data = await res.json()
          const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
          setInvoiceItems(items as InvoiceListItem[])
          // Seed first row if in edit mode
          if (defaults?.invoiceId && mode === "edit") {
            const desired = String(defaults.invoiceId)
            const found = items.find((i: any) => String(i.id) === desired)
            if (found) {
              setInvoiceRows([{ invoiceId: desired, amount: Number(found.dueAmount ?? 0) }])
            }
          }
        } catch (e) {
          // ignore
        } finally {
          setInvoiceLoading(false)
        }
      })()
    return () => ctrl.abort()
  }, [selectedClientId, paymentToVal])

  useEffect(() => {
    // Load non-commission invoices (tickets) for selected client
    if (paymentToVal !== "tickets" || !selectedClientId) { setTicketItems([]); return }
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setTicketLoading(true)
          const res = await fetch(`/api/invoices?page=1&pageSize=100&clientId=${encodeURIComponent(selectedClientId)}&invoiceType=non_commission`, { signal: ctrl.signal })
          if (!res.ok) return
          const data = await res.json()
          const invoices: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
          
          // Flatten tickets from all non-commission invoices
          const tickets: TicketItem[] = []
          invoices.forEach((inv) => {
            if (Array.isArray(inv.tickets) && inv.tickets.length > 0) {
              inv.tickets.forEach((t: any) => {
                tickets.push({
                  id: t.id, // This is InvoiceItem _id
                  invoiceId: inv.id,
                  invoiceNo: inv.invoiceNo,
                  ticketNo: t.ticketNo || "",
                  paxName: t.paxName || "",
                  salesDate: inv.salesDate,
                  totalSales: t.totalSales || 0,
                  receivedAmount: t.paidAmount || 0,
                  dueAmount: t.dueAmount || 0,
                })
              })
            } else {
              // Fallback if no tickets array found (should not happen with updated backend)
              tickets.push({
                id: inv.id,
                invoiceId: inv.id,
                invoiceNo: inv.invoiceNo,
                ticketNo: inv.invoiceNo,
                paxName: "",
                salesDate: inv.salesDate,
                totalSales: inv.salesPrice,
                receivedAmount: inv.receivedAmount,
                dueAmount: inv.dueAmount,
              })
            }
          })
          setTicketItems(tickets)
        } catch {
          // ignore
        } finally {
          setTicketLoading(false)
        }
      })()
    return () => ctrl.abort()
  }, [selectedClientId, paymentToVal])

  // Helper: get invoice from list by id
  const getInvoiceById = useCallback((id: string) => invoiceItems.find(i => i.id === id), [invoiceItems])

  // Sync total amount field with sum of invoice rows
  const invoiceRowsTotal = useMemo(() => invoiceRows.reduce((s, r) => s + Number(r.amount || 0), 0), [invoiceRows])
  const ticketRowsTotal = useMemo(() => ticketRows.reduce((s, r) => s + Number(r.amount || 0), 0), [ticketRows])

  useEffect(() => {
    if (paymentToVal === "invoice") form.setValue("amount", invoiceRowsTotal)
  }, [invoiceRowsTotal, paymentToVal])

  useEffect(() => {
    if (paymentToVal === "tickets") form.setValue("amount", ticketRowsTotal)
  }, [ticketRowsTotal, paymentToVal])

  // Reset rows when payment type changes
  useEffect(() => {
    if (paymentToVal === "invoice") setInvoiceRows([{ invoiceId: "", amount: 0 }])
    if (paymentToVal === "tickets") setTicketRows([{ ticketId: "", invoiceId: "", amount: 0 }])
  }, [paymentToVal])

  const handleSubmit = async (values: FormValues) => {
    const client = clients.find(c => c.id === values.clientId)
    const account = filteredAccounts.find(a => a.id === values.accountId)

    const payload: any = {
      clientId: values.clientId,
      paymentTo: values.paymentTo,
      paymentMethod: values.paymentMethod,
      accountId: values.accountId,
      accountName: account?.name ?? "",
      manualReceiptNo: values.manualReceiptNo,
      amount: values.amount,
      discount: values.discount ?? 0,
      paymentDate: values.paymentDate,
      note: values.note,
      docOneName: docOne?.name,
      docTwoName: docTwo?.name,
    }

    if (values.paymentTo === "invoice") {
      const validRows = invoiceRows.filter(r => r.invoiceId && r.amount > 0)
      if (validRows.length === 1) {
        // backward-compatible single invoice
        payload.invoiceId = validRows[0].invoiceId
      } else if (validRows.length > 1) {
        payload.invoiceAllocations = validRows.map(r => ({ invoiceId: r.invoiceId, amount: r.amount }))
      } else {
        payload.invoiceId = invoiceRows[0]?.invoiceId || undefined
      }
    }

    if (values.paymentTo === "tickets") {
      const validRows = ticketRows.filter(r => r.invoiceId && r.amount > 0)
      if (validRows.length > 0) {
        payload.invoiceAllocations = validRows.map(r => ({ invoiceId: r.invoiceId, amount: r.amount }))
      }
    }

    try {
      setSubmitting(true)
      const isEdit = mode === "edit" && !!editId
      const url = isEdit ? `/api/money-receipts/${editId}` : "/api/money-receipts"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: isEdit ? "Failed to update receipt" : "Failed to create receipt",
          description: data?.message || data?.error || "Unknown error",
          variant: "destructive",
        })
        return
      }
      const created = data?.created || {}
      const updated = data?.updated || {}

      const rawType = String(created?.receipt_payment_to || values.paymentTo).toUpperCase()
      const validTypes: MoneyReceipt["invoiceType"][] = ["OVERALL", "INVOICE", "ADVANCE", "TICKETS", "ADJUST"]
      const invoiceType: MoneyReceipt["invoiceType"] = validTypes.includes(rawType as any) ? (rawType as MoneyReceipt["invoiceType"]) : "OVERALL"
      const receipt: MoneyReceipt = {
        id: isEdit ? String(editId) : String(created?.doc_id || ''),
        paymentDate: String(created?.receipt_payment_date || values.paymentDate),
        voucherNo: String(created?.receipt_vouchar_no || updated?.receipt_vouchar_no || ""),
        clientId: values.clientId,
        clientName: client?.name ?? String(created?.client_name || ""),
        invoiceType,
        paymentTo: values.paymentTo,
        paymentMethod: values.paymentMethod,
        accountId: values.accountId,
        accountName: account?.name ?? String(created?.account_name || updated?.account_name || ""),
        manualReceiptNo: values.manualReceiptNo || created?.receipt_money_receipt_no,
        amount: values.amount,
        discount: values.discount ?? 0,
        paidAmount: Number((isEdit ? updated?.receipt_total_amount : created?.receipt_total_amount) || (values.amount - (values.discount ?? 0) || 0)),
        presentDue: typeof (isEdit ? updated?.present_balance : created?.present_balance) === "number"
          ? (isEdit ? updated.present_balance : created.present_balance)
          : (values.presentDue ?? 0),
        note: values.note,
        docOneName: docOne?.name,
        docTwoName: docTwo?.name,
        showBalance: values.showBalance,
      }
      onSubmit(receipt)
      onOpenChange(false)
      form.reset()
      setDocOne(undefined)
      setDocTwo(undefined)
      setInvoiceRows([{ invoiceId: "", amount: 0 }])
      setTicketRows([{ ticketId: "", invoiceId: "", amount: 0 }])
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SharedModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit Money Receipt" : "Create Money Receipt"}
      maxWidth="max-w-5xl"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Select Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Select Client:
                      </FormLabel>
                      <FormControl>
                        <ClientSelect
                          value={field.value}
                          onChange={(id) => field.onChange(id || "")}
                          preloaded={clients}
                          placeholder="Select client"
                          className={fieldState.error ? "border-red-500" : undefined}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Present Due (uses API presentBalance) */}
                <FormField
                  control={form.control}
                  name="presentDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Present Due:</FormLabel>
                      <FormControl>
                        <Input type="number" disabled value={Number(field.value ?? 0) < 0 ? field.value :0} className={(Number(field.value ?? 0) < 0) ? "border-red-500" : undefined} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment To */}
              <FormField
                control={form.control}
                name="paymentTo"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="text-destructive mr-1">*</span> Payment To:
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClientId}>
                        <SelectTrigger className={fieldState.error ? "border-red-500" : undefined}>
                          <SelectValue placeholder="Payment To:" />
                        </SelectTrigger>
                        <SelectContent>
                          {(paymentTos && paymentTos.length ? paymentTos : [
                            { id: "overall", label: "Over All" },
                            { id: "advance", label: "Advance Payment" },
                            { id: "invoice", label: "Specific Invoice" },
                            { id: "tickets", label: "Specific Tickets" },
                            { id: "adjust", label: "Adjust With Due" },
                          ]).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic sections based on Payment To */}

              {/* ── Specific Invoice: multi-row ── */}
              {form.watch("paymentTo") === "invoice" && (
                <div className="rounded-md border bg-gray-50 p-4 space-y-3">
                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <div className="col-span-3">Invoice No.</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Net Total</div>
                    <div className="col-span-2">Paid</div>
                    <div className="col-span-1">Due</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1" />
                  </div>

                  {invoiceRows.map((row, idx) => {
                    const inv = getInvoiceById(row.invoiceId)
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 md:col-span-3">
                          <Select
                            value={row.invoiceId}
                            onValueChange={(v) => {
                              const found = invoiceItems.find(i => i.id === v)
                              setInvoiceRows(prev => prev.map((r, i) => i === idx ? { ...r, invoiceId: v, amount: Number(found?.dueAmount ?? 0) } : r))
                            }}
                            disabled={invoiceLoading || !invoiceItems.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={invoiceLoading ? "Loading..." : "Select Invoice"} />
                            </SelectTrigger>
                            <SelectContent>
                              {invoiceItems.map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.invoiceNo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Date" value={inv?.salesDate ? String(inv.salesDate).slice(0, 10) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Net Total" value={inv ? String(inv.salesPrice ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Paid" value={inv ? String(inv.receivedAmount ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-1">
                          <Input readOnly placeholder="Due" value={inv ? String(inv.dueAmount ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-10 md:col-span-1">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={row.amount ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value || 0)
                              const capped = inv ? Math.min(val, inv.dueAmount ?? val) : val
                              setInvoiceRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: capped } : r))
                            }}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-center">
                          {idx === invoiceRows.length - 1 ? (
                            <Button
                              type="button"
                              size="icon"
                              className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600"
                              onClick={() => setInvoiceRows(prev => [...prev, { invoiceId: "", amount: 0 }])}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => setInvoiceRows(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex justify-end text-sm font-medium pt-1">
                    Total: {invoiceRowsTotal.toFixed(2)}
                  </div>
                </div>
              )}

              {/* ── Specific Tickets: multi-row (non-commission invoices) ── */}
              {form.watch("paymentTo") === "tickets" && (
                <div className="rounded-md border bg-gray-50 p-4 space-y-3">
                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <div className="col-span-3">Invoice / Ticket No.</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Net Total</div>
                    <div className="col-span-2">Paid</div>
                    <div className="col-span-1">Due</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1" />
                  </div>

                  {ticketRows.map((row, idx) => {
                    const ticket = ticketItems.find(t => t.id === row.ticketId)
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 md:col-span-3">
                          <Select
                            value={row.ticketId}
                            onValueChange={(v) => {
                              const found = ticketItems.find(t => t.id === v)
                              setTicketRows(prev => prev.map((r, i) => i === idx
                                ? { ...r, ticketId: v, invoiceId: found?.invoiceId ?? v, amount: Number(found?.dueAmount ?? 0) }
                                : r))
                            }}
                            disabled={ticketLoading || !ticketItems.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={ticketLoading ? "Loading..." : "Select Ticket / Invoice"} />
                            </SelectTrigger>
                            <SelectContent>
                        {ticketItems.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.invoiceNo} {t.ticketNo ? `- ${t.ticketNo}` : ""} {t.paxName ? `(${t.paxName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Date" value={ticket?.salesDate ? String(ticket.salesDate).slice(0, 10) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Net Total" value={ticket ? String(ticket.totalSales ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Input readOnly placeholder="Paid" value={ticket ? String(ticket.receivedAmount ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-1">
                          <Input readOnly placeholder="Due" value={ticket ? String(ticket.dueAmount ?? 0) : ""} className="bg-muted text-xs" />
                        </div>
                        <div className="col-span-10 md:col-span-1">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={row.amount ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value || 0)
                              const capped = ticket ? Math.min(val, ticket.dueAmount ?? val) : val
                              setTicketRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: capped } : r))
                            }}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-center">
                          {idx === ticketRows.length - 1 ? (
                            <Button
                              type="button"
                              size="icon"
                              className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600"
                              onClick={() => setTicketRows(prev => [...prev, { ticketId: "", invoiceId: "", amount: 0 }])}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => setTicketRows(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex justify-end text-sm font-medium pt-1">
                    Total: {ticketRowsTotal.toFixed(2)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Payment Method:
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={fieldState.error ? "border-red-500" : undefined}>
                            <SelectValue placeholder="Select Payment Method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethodOptions.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Account */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Account:
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch("paymentMethod")}>
                          <SelectTrigger className={fieldState.error ? "border-red-500" : undefined}>
                            <SelectValue placeholder="Select Account:" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAccounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount — read-only when driven by invoice/ticket row totals */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field, fieldState }) => {
                    const isRowDriven = paymentToVal === "invoice" || paymentToVal === "tickets"
                    return (
                      <FormItem>
                        <FormLabel>
                          <span className="text-destructive mr-1">*</span> Amount:
                          {isRowDriven && <span className="ml-2 text-xs text-muted-foreground">(auto-calculated from rows)</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount:"
                            {...field}
                            readOnly={isRowDriven}
                            className={[fieldState.error ? "border-red-500" : "", isRowDriven ? "bg-muted" : ""].join(" ").trim()}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )
                  }}
                />

                {/* Discount */}
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount:</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Discount:" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Date */}
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Payment Date:
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(d) => field.onChange(d ? d.toISOString().slice(0, 10) : "")}
                          placeholder="Select date"
                          className={fieldState.error ? "border-red-500" : undefined}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Manual Money receipt no */}
                <FormField
                  control={form.control}
                  name="manualReceiptNo"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Manual Money receipt no</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Manual Money receipt no" 
                          {...field} 
                          className={fieldState.error ? "border-red-500" : undefined}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Note */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note:</FormLabel>
                    <FormControl>
                      <Input placeholder="Note:" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Upload docs + Show Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label>Upload Docs (Max 1MB)</Label>
                  <FileUploadButton label="Upload Doc" onFileSelected={setDocOne} />
                </div>
                <div className="space-y-2">
                  <Label>Upload Docs (Max 1MB)</Label>
                  <FileUploadButton label="Upload Doc" onFileSelected={setDocTwo} />
                </div>
                <FormField
                  control={form.control}
                  name="showBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Show Balance?</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value ? "yes" : "no"} onValueChange={(val) => field.onChange(val === "yes")} className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem id="show-yes" value="yes" />
                            <Label htmlFor="show-yes">Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem id="show-no" value="no" />
                            <Label htmlFor="show-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit"  disabled={submitting}>
                  {mode === "edit" ? (submitting ? "Updating..." : "Update Receipt") : (submitting ? "Creating..." : "Create Money Receipt")}
                </Button>
              </div>
            </form>
          </Form>
    </SharedModal>
  )
}
