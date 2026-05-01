"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import VendorSelect from "@/components/vendors/vendor-select"
import { Upload } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import SpecificInvoicePayment from "./specific-invoice-payment"

import { SharedModal } from "@/components/shared/shared-modal"

interface AccountOptionItem {
  id: string
  name: string
  type: string
  lastBalance?: number
}

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  accountsPreloaded?: AccountOptionItem[]
  initialData?: any
  loading?: boolean
}

export default function PaymentModal({ open, onOpenChange, onSubmit, accountsPreloaded, initialData, loading = false }: PaymentModalProps) {
  const { data: session } = useSession()
  const methods = useForm({
    defaultValues: {
      paymentTo: "overall",
      invoiceId: "",
      ticketVendorId: "",
      invoiceVendors: [] as any[],
      vendorId: "",
      presentBalance: 0,
      paymentMethod: "",
      accountId: "",
      availableBalance: 0,
      amount: 0,
      vendorAit: 0,
      totalAmount: 0,
      receiptNo: "",
      referPassport: "no",
      passportNo: "",
      date: new Date(),
      note: "",
      voucher: null as File | null
    }
  })

  const { register, handleSubmit, setValue, watch, reset, getValues } = methods
  const isEdit = !!initialData

  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [accounts, setAccounts] = useState<AccountOptionItem[]>(accountsPreloaded || [])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>([])
  const [vendorBalanceStatus, setVendorBalanceStatus] = useState<"due" | "advance" | null>(null)
  
  const paymentTo = watch("paymentTo")
  const referPassport = watch("referPassport")
  const amount = watch("amount")
  const vendorAit = watch("vendorAit")
  const vendorId = watch("vendorId")
  const paymentMethod = watch("paymentMethod")
  const accountId = watch("accountId")
  const dateValue = watch("date")

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Reset form with initial data for edit
        reset({
          paymentTo: initialData.paymentTo || "overall",
          invoiceId: initialData.invoiceId || "",
          ticketVendorId: initialData.ticketVendorId || "",
          invoiceVendors: initialData.invoiceVendors || [],
          vendorId: initialData.vendorId || "",
          presentBalance: 0, // Will be fetched
          paymentMethod: initialData.paymentMethod || "",
          accountId: initialData.accountId || "",
          availableBalance: 0, // Will be fetched
          amount: initialData.amount || 0,
          vendorAit: initialData.vendorAit || 0,
          totalAmount: initialData.totalAmount || 0,
          receiptNo: initialData.receiptNo || "",
          referPassport: initialData.referPassport || "no",
          passportNo: initialData.passportNo || "",
          date: initialData.date ? new Date(initialData.date) : new Date(),
          note: initialData.note || "",
          voucher: null
        })
      } else {
        // Reset to default for create
        reset({
          paymentTo: "overall",
          invoiceId: "",
          ticketVendorId: "",
          invoiceVendors: [],
          vendorId: "",
          presentBalance: 0,
          paymentMethod: "",
          accountId: "",
          availableBalance: 0,
          amount: 0,
          vendorAit: 0,
          totalAmount: 0,
          receiptNo: "",
          referPassport: "no",
          passportNo: "",
          date: new Date(),
          note: "",
          voucher: null
        })
      }
      setFieldErrors({})
    }
  }, [open, initialData, reset])

  // Fetch Account Types (Payment Methods)
  useEffect(() => {
    if (!open) return
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
  }, [open])

  // Fetch Accounts with Balances (if preloaded doesn't have balances or to be fresh)
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    ;(async () => {
      try {
        // We fetch accounts to ensure we have the latest balance (lastBalance)
        const res = await fetch(`/api/accounts?page=1&pageSize=100`, { 
          signal: ctrl.signal,
          headers: { "x-company-id": session?.user?.companyId ?? "" }
        })
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map((i: any) => ({
          id: String(i.id || i._id),
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          type: String(i.type || "Cash"),
          lastBalance: typeof i.lastBalance === "number" ? i.lastBalance : Number(i.lastBalance || 0),
        }))
        setAccounts(mapped)
      } catch (e) {
        console.error("Failed to fetch accounts", e)
        // Fallback to preloaded if fetch fails
        if (accountsPreloaded) setAccounts(accountsPreloaded)
      }
    })()
    return () => ctrl.abort()
  }, [open, session, accountsPreloaded])

  // Fetch Vendor Balance
  useEffect(() => {
    if (!vendorId) {
      setValue("presentBalance", 0)
      setVendorBalanceStatus(null)
      return
    }
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/vendors/${vendorId}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json()
        const v = data.vendor
        
        // Handle object-based presentBalance (e.g. { type: "due", amount: 50 })
        // or number-based (legacy)
        let bal = 0
        let status: "due" | "advance" | null = null

        if (v?.presentBalance && typeof v.presentBalance === 'object') {
          bal = Number(v.presentBalance.amount || 0)
          status = v.presentBalance.type === "due" ? "due" : "advance"
        } else {
          bal = Number(v?.presentBalance || v?.balance || 0)
          // Simple logic if no type provided: positive is advance, negative is due? 
          // Or just assume 0. Let's stick to the object if available.
          if (bal < 0) status = "due"
          else if (bal > 0) status = "advance"
        }

        setValue("presentBalance", bal)
        setVendorBalanceStatus(status)
      } catch (e) {
        // ignore
      }
    })()
    return () => ctrl.abort()
  }, [vendorId, setValue])

  // Filter Accounts based on Payment Method
  const filteredAccounts = useMemo(() => {
    if (!paymentMethod) return []
    return accounts.filter(a => a.type === paymentMethod)
  }, [accounts, paymentMethod])

  // Update Available Balance when Account changes
  useEffect(() => {
    if (!accountId) {
      setValue("availableBalance", 0)
      return
    }
    const acc = accounts.find(a => a.id === accountId)
    if (acc) {
      setValue("availableBalance", acc.lastBalance || 0)
    }
  }, [accountId, accounts, setValue])

  // Auto-calculate total amount
  useEffect(() => {
    const total = (Number(amount) || 0) + (Number(vendorAit) || 0)
    setValue("totalAmount", total)
  }, [amount, vendorAit, setValue])

  const onFormSubmit = async (data: any) => {
    const errs: Record<string, boolean> = {}
    const pm = data.paymentMethod || paymentMethod
    const acc = data.accountId || accountId
    const pTo = data.paymentTo || paymentTo
    const vId = data.vendorId || vendorId
    const total = Number(data.totalAmount) || 0

    if (!pm) errs.paymentMethod = true
    if (!acc) errs.accountId = true
    if (total <= 0) errs.amount = true

    if (pTo === "invoice") {
      const inv = data.invoiceId ?? getValues("invoiceId")
      const iv = (data.invoiceVendors ?? getValues("invoiceVendors")) || []
      if (!inv) errs.invoiceId = true
      const sum = Array.isArray(iv) ? iv.reduce((s: number, row: any) => s + (Number(row?.amount) || 0), 0) : 0
      if (!Array.isArray(iv) || iv.length === 0 || sum <= 0) errs.invoiceVendors = true
    } else if (pTo === "ticket") {
      const tv = data.ticketVendorId ?? getValues("ticketVendorId")
      const iv = (data.invoiceVendors ?? getValues("invoiceVendors")) || []
      if (!tv) errs.ticketVendorId = true
      const sum = Array.isArray(iv) ? iv.reduce((s: number, row: any) => s + (Number(row?.amount) || 0), 0) : 0
      const linesOk =
        Array.isArray(iv) &&
        iv.length > 0 &&
        iv.every((row: any) => row?.invoiceItemId && String(row.invoiceItemId).length > 0)
      if (!linesOk || sum <= 0) errs.invoiceVendors = true
    } else if (!vId) {
      errs.vendorId = true
    }

    if (data.referPassport === "yes" && !(data.passportNo || "").trim()) errs.passportNo = true

    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    try {
      await onSubmit(data)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <SharedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Payment" : "Add Payment"}
      maxWidth="max-w-4xl"
      formId="vendor-payment-form"
      submitText={isEdit ? "Update Payment" : "Submit Payment"}
      cancelText="Cancel"
      loading={loading}
    >
      <FormProvider {...methods}>
        <form id="vendor-payment-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Payment To & Invoice Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
              {/* Payment To */}
              <div className="space-y-2">
                <Label>Payment To</Label>
                <Select
                  onValueChange={(val) => {
                    setValue("paymentTo", val)
                    if (val !== "invoice") {
                      setValue("invoiceId", "")
                    }
                    if (val !== "ticket") {
                      setValue("ticketVendorId", "")
                    }
                    if (val !== "invoice" && val !== "ticket") {
                      setValue("invoiceVendors", [])
                    }
                  }}
                  value={paymentTo}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="invoice">Specific Invoice</SelectItem>
                    <SelectItem value="advance">Advance Payment</SelectItem>
                    <SelectItem value="ticket">Specific Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Selection (Only visible when paymentTo is 'invoice') */}
              {paymentTo === "invoice" && (
                <div className={cn(fieldErrors.invoiceId && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                  <SpecificInvoicePayment mode="select-only" disabled={isEdit} variant="invoice" />
                </div>
              )}
              {paymentTo === "ticket" && (
                <div className={cn(fieldErrors.ticketVendorId && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                  <SpecificInvoicePayment mode="select-only" disabled={isEdit} variant="ticket" />
                </div>
              )}
            </div>

            {paymentTo === "invoice" ? (
              <div className={cn("md:col-span-2", fieldErrors.invoiceVendors && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                <SpecificInvoicePayment mode="table-only" variant="invoice" />
              </div>
            ) : paymentTo === "ticket" ? (
              <div className={cn("md:col-span-2", fieldErrors.invoiceVendors && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                <SpecificInvoicePayment mode="table-only" variant="ticket" />
              </div>
            ) : (
              <>
                {/* Select Vendor */}
                <div className="space-y-2">
                  <Label>Select Vendor <span className="text-red-500">*</span></Label>
                  <div className={cn(fieldErrors.vendorId && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                    <VendorSelect 
                      value={watch("vendorId")}
                      onChange={(id) => setValue("vendorId", id || "")}
                      placeholder="Select Vendor"
                    />
                  </div>
                </div>

                {/* Present Balance */}
                <div className="space-y-2">
                  <Label>
                    Present Balance
                    {vendorBalanceStatus && (
                      <span className={cn(
                        "ml-2 text-xs font-medium px-2 py-0.5 rounded",
                        vendorBalanceStatus === "due" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {vendorBalanceStatus === "due" ? "Due" : "Advance"}
                      </span>
                    )}
                  </Label>
                  <Input 
                    type="number" 
                    readOnly 
                    {...register("presentBalance")} 
                    className={cn(
                      "bg-muted",
                      vendorBalanceStatus === "due" && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>
              </>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => {
                  setValue("paymentMethod", val)
                  setValue("accountId", "")
                }}
                disabled={isEdit}
              >
                <SelectTrigger className={cn(fieldErrors.paymentMethod && "border-red-500 focus:ring-red-500")}>
                  <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Account <span className="text-red-500">*</span></Label>
              <Select 
                onValueChange={(val) => setValue("accountId", val)}
                value={accountId}
                disabled={!paymentMethod}
              >
                <SelectTrigger className={cn(fieldErrors.accountId && "border-red-500 focus:ring-red-500")}>
                  <SelectValue placeholder={paymentMethod ? "Select Account" : "Select Method First"} />
                  </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Balance */}
            <div className="space-y-2">
              <Label>Available Balance</Label>
              <Input 
                type="number" 
                readOnly 
                {...register("availableBalance")} 
                className="bg-muted"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <Input 
                type="number" 
                placeholder="0.00"
                {...register("amount")} 
                readOnly={paymentTo === "invoice" || paymentTo === "ticket"}
                className={cn(
                  paymentTo === "invoice" || paymentTo === "ticket" ? "bg-muted" : "",
                  fieldErrors.amount && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </div>

            {/* Vendor AIT */}
            <div className="space-y-2">
              <Label>Vendor AIT</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                {...register("vendorAit")} 
              />
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input 
                type="number" 
                readOnly 
                {...register("totalAmount")} 
                className="bg-muted"
              />
            </div>

            {/* Receipt/Trans No */}
            <div className="space-y-2">
              <Label>Receipt/Trans No</Label>
              <Input 
                placeholder="Enter Receipt/Transaction No"
                {...register("receiptNo")} 
              />
            </div>

            {/* Refer Passport No */}
            <div className="space-y-2">
              <Label>Refer Passport no</Label>
              <Select 
                onValueChange={(val) => setValue("referPassport", val)} 
                defaultValue="no"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Passport Field */}
            {referPassport === "yes" && (
              <div className="space-y-2">
                <Label>Passport No <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="Enter Passport Number"
                  {...register("passportNo")} 
                  className={cn(fieldErrors.passportNo && "border-red-500 focus-visible:ring-red-500")}
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2 flex flex-col">
              <Label>Date</Label>
              <DateInput 
                value={dateValue}
                onChange={(date) => setValue("date", date || new Date())}
              />
            </div>

            {/* Voucher Upload */}
            <div className="space-y-2">
              <Label>Voucher Upload</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setValue("voucher", file)
                  }}
                />
              </div>
            </div>

            {/* Note - Full Width */}
            <div className="md:col-span-2 space-y-2">
              <Label>Note</Label>
              <Textarea 
                placeholder="Enter any notes..."
                {...register("note")} 
              />
            </div>
          </div>
        </form>
      </FormProvider>
    </SharedModal>
  )
}
