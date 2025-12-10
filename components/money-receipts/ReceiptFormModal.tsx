"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

const paymentMethodOptions: AccountType[] = ["Cash", "Bank", "Mobile banking", "Credit Card"]

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
    salesDate: string
    salesPrice: number
    receivedAmount: number
    dueAmount: number
  }
  const [invoiceItems, setInvoiceItems] = useState<InvoiceListItem[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(mode === "edit" && defaults?.paymentTo === "invoice" && defaults?.invoiceId ? String(defaults.invoiceId) : "")
  const [submitting, setSubmitting] = useState(false)

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
        manualReceiptNo: mode === "create" ? nextVoucher : (defaults?.manualReceiptNo ?? ""),
        note: defaults?.note ?? "",
        showBalance: defaults?.showBalance ?? true,
      })
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
          const res = await fetch(`/api/invoices?page=1&pageSize=50&clientId=${encodeURIComponent(selectedClientId)}`, { signal: ctrl.signal })
          if (!res.ok) return
          const data = await res.json()
          const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
          setInvoiceItems(items as InvoiceListItem[])
          if (!selectedInvoiceId && items && items.length) {
            const desired = defaults?.invoiceId ? String(defaults.invoiceId) : ""
            const found = desired && items.find((i: any) => String(i.id) === desired)
            setSelectedInvoiceId(String(found?.id || items[0].id))
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
    // When switching to edit mode with an invoice, set selected invoice
    if (mode === "edit" && defaults?.paymentTo === "invoice" && defaults?.invoiceId) {
      setSelectedInvoiceId(String(defaults.invoiceId))
    }
  }, [mode, defaults?.invoiceId, defaults?.paymentTo, open])

  const selectedInvoice = useMemo(() => invoiceItems.find(i => i.id === selectedInvoiceId), [invoiceItems, selectedInvoiceId])

  useEffect(() => {
    // Default amount to selected invoice due when switching
    if (paymentToVal === "invoice") {
      const current = form.getValues("amount")
      if ((!current || Number(current) === 0) && selectedInvoice && typeof selectedInvoice.dueAmount === "number") {
        form.setValue("amount", Number(selectedInvoice.dueAmount) || 0)
      }
    }
  }, [selectedInvoiceId])

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
      invoiceId: values.paymentTo === "invoice" ? selectedInvoiceId : undefined,
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

      const invoiceType: MoneyReceipt["invoiceType"] = (String(created?.receipt_payment_to || values.paymentTo).toUpperCase() === "INVOICE") ? "INVOICE" : "OVERALL"
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
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70%] max-w-[70%]">
        <DialogHeader>
          <DialogTitle>Create Money Receipt</DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Select Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
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
                        />
                      </FormControl>
                      <FormMessage />
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
                        <Input type="number" disabled value={field.value ?? 0} />
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="text-destructive mr-1">*</span> Payment To:
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClientId}>
                        <SelectTrigger>
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
              {form.watch("paymentTo") === "invoice" && (
                <div className="rounded-md border bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Invoice No.</Label>
                      <Select value={selectedInvoiceId} onValueChange={(v) => setSelectedInvoiceId(v)} disabled={invoiceLoading || !invoiceItems.length}>
                        <SelectTrigger>
                          <SelectValue placeholder={invoiceLoading ? "Loading..." : "Select Invoice No."} />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceItems.map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.invoiceNo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Date</Label>
                      <Input disabled placeholder="Invoice Date" value={selectedInvoice?.salesDate ? String(selectedInvoice.salesDate).slice(0, 10) : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Net Total</Label>
                      <Input disabled placeholder="Net Total" value={selectedInvoice ? String(selectedInvoice.salesPrice ?? 0) : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Paid</Label>
                      <Input disabled placeholder="Paid" value={selectedInvoice ? String(selectedInvoice.receivedAmount ?? 0) : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due</Label>
                      <Input disabled placeholder="0" value={selectedInvoice ? String(selectedInvoice.dueAmount ?? 0) : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label><span className="text-destructive mr-1">*</span> Amount</Label>
                      <Input type="number" step="0.01" placeholder="Amount" value={form.watch("amount") ?? 0} onChange={(e) => form.setValue("amount", Number(e.target.value || 0))} />
                    </div>
                  </div>
                  <Button type="button" variant="secondary">Add field</Button>
                </div>
              )}
              {form.watch("paymentTo") === "tickets" && (
                <div className="rounded-md border bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Ticket No.</Label>
                      <Select onValueChange={() => { }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Ticket" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tk-1001">TK-1001</SelectItem>
                          <SelectItem value="tk-1002">TK-1002</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Net Total</Label>
                      <Input disabled placeholder="Net Total" />
                    </div>
                    <div className="space-y-2">
                      <Label>Paid</Label>
                      <Input disabled placeholder="Paid" />
                    </div>
                    <div className="space-y-2">
                      <Label>Due</Label>
                      <Input disabled placeholder="Due" />
                    </div>
                    <div className="space-y-2">
                      <Label><span className="text-destructive mr-1">*</span> Amount</Label>
                      <Input type="number" step="0.01" placeholder="Amount" />
                    </div>
                  </div>
                  <Button type="button" variant="secondary">Add field</Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Payment Method:
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Payment Method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethodOptions.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Account:
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!paymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account:" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAccounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Amount:
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Amount:" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive mr-1">*</span> Payment Date:
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(d) => field.onChange(d ? d.toISOString().slice(0, 10) : "")}
                          placeholder="Select date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Manual Money receipt no (disabled) */}
                <FormField
                  control={form.control}
                  name="manualReceiptNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Money receipt no</FormLabel>
                      <FormControl>
                        <Input disabled placeholder="Manual Money receipt no" value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
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

              <div className="pt-2">
                <Button type="submit" className="w-fit" disabled={submitting}>{mode === "edit" ? (submitting ? "Updating..." : "Update Receipt") : (submitting ? "Creating..." : "Create Money Receipt")}</Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
